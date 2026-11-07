import { persistJobs } from "@/lib/jobs/store";
import { prisma } from "@/lib/db";
import { discoverJobs } from "@/services/job-discovery";
import { inngest } from "./client";

/** Daily discovery sweep across all configured providers. */
export const dailyDiscovery = inngest.createFunction(
  {
    id: "daily-job-discovery",
    retries: 2,
    triggers: [{ cron: "0 6 * * *" }], // daily 06:00 UTC
  },
  async ({ step }) => {
    const queries = [
      "software engineer",
      "frontend developer",
      "backend developer",
      "full stack engineer",
      "devops engineer",
      "data engineer",
    ];
    let total = 0;
    for (const q of queries) {
      const count = await step.run(`discover-${q}`, async () => {
        const { jobs, usedMock } = await discoverJobs({
          query: q,
          pageSize: 25,
        });
        if (usedMock) return 0;
        const persisted = await persistJobs(jobs.slice(0, 50));
        return persisted.length;
      });
      total += count;
    }
    return { discovered: total };
  },
);

/** Process a user-triggered or alert-triggered discovery run. */
export const onDemandDiscovery = inngest.createFunction(
  {
    id: "on-demand-discovery",
    retries: 2,
    triggers: [{ event: "jobs/discovery.requested" }],
  },
  async ({ event, step }) => {
    const { query, filters, user_id } = event.data as {
      query?: string;
      filters?: Record<string, unknown>;
      user_id?: string;
    };
    const { jobs } = await step.run("discover", () =>
      discoverJobs({
        query: query ?? "software engineer",
        filters: filters as never,
        pageSize: 50,
      }),
    );
    const persisted = await step.run("persist", () =>
      persistJobs(jobs.slice(0, 100)),
    );

    if (user_id && persisted.length) {
      await prisma.notification.create({
        data: {
          user_id,
          type: "job_discovery",
          title: "New jobs discovered",
          message: `${persisted.length} jobs matching "${query ?? "your search"}" were discovered.`,
          data: { count: persisted.length },
        },
      });
    }
    return { persisted: persisted.length };
  },
);

/** Weekly: expire jobs published more than 60 days ago. */
export const refreshJobStatus = inngest.createFunction(
  {
    id: "refresh-job-status",
    retries: 1,
    triggers: [{ cron: "0 3 * * 0" }], // Sunday 03:00 UTC
  },
  async ({ step }) => {
    await step.run("mark-stale", async () => {
      const cutoff = new Date(Date.now() - 60 * 86400000);
      await prisma.job.updateMany({
        where: { status: "active", published_at: { lt: cutoff } },
        data: { status: "expired" },
      });
    });
    return { done: true };
  },
);

/** Process search alerts: run each active alert's filters and notify. */
export const processAlerts = inngest.createFunction(
  {
    id: "process-search-alerts",
    retries: 2,
    triggers: [{ cron: "0 */6 * * *" }], // every 6 hours
  },
  async ({ step }) => {
    const alerts = await prisma.searchAlert.findMany({
      where: { is_active: true },
    });
    let notified = 0;
    for (const alert of alerts ?? []) {
      const filters = (alert.filters ?? {}) as Record<string, unknown>;
      const query =
        (filters.keywords as string) ||
        (filters.job_title as string) ||
        (filters.skill as string) ||
        "software engineer";
      const result = await step.run(`alert-${alert.id}`, async () => {
        const { jobs } = await discoverJobs({
          query,
          filters: filters as never,
          pageSize: 15,
        });
        const fresh = jobs.filter((j) => !j.is_mock).slice(0, 5);
        if (!fresh.length) return 0;
        await prisma.notification.create({
          data: {
            user_id: alert.user_id,
            type: "alert",
            title: `Job alert: ${alert.name}`,
            message: `${fresh.length} new opportunities match your saved search "${alert.name}".`,
            data: {
              jobs: fresh.map((j) => ({
                id: j.external_id,
                title: j.title,
                company: j.company,
                url: j.application_url,
              })),
            },
          },
        });
        await prisma.searchAlert.update({
          where: { id: alert.id },
          data: { last_sent_at: new Date() },
        });
        return fresh.length;
      });
      notified += result;
    }
    return {
      alerts_processed: alerts.length,
      notifications_sent: notified,
    };
  },
);
