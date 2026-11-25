import { prisma } from "@/lib/db";
import { persistJobs } from "@/lib/jobs/store";
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

/** Daily: remind users to follow up on stale applications. */
export const applicationFollowUpReminders = inngest.createFunction(
  {
    id: "application-follow-up-reminders",
    retries: 2,
    triggers: [{ cron: "0 9 * * *" }], // daily 09:00 UTC
  },
  async ({ step }) => {
    const staleDays = 7; // Remind after 7 days of no activity
    const cutoff = new Date(Date.now() - staleDays * 86400000);

    const staleApps = await step.run("find-stale-applications", async () => {
      return prisma.application.findMany({
        where: {
          status: { in: ["applied", "assessment", "interview", "technical_interview", "final_interview"] },
          updated_at: { lt: cutoff },
        },
        include: {
          job: {
            select: {
              title: true,
              company: true,
            },
          },
        },
        take: 100, // Limit to prevent overload
      });
    });

    let notified = 0;
    for (const app of staleApps) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(app.updated_at).getTime()) / 86400000,
      );

      await step.run(`notify-${app.id}`, async () => {
        await prisma.notification.create({
          data: {
            user_id: app.user_id,
            type: "application_reminder",
            title: "Follow up on application",
            message: `It's been ${daysSinceUpdate} days since you last updated your application for ${app.job?.title ?? "Unknown"} at ${app.job?.company ?? "Unknown"}. Consider following up with the recruiter.`,
            data: {
              application_id: app.id,
              job_id: app.job_id,
              days_since_update: daysSinceUpdate,
            },
          },
        });
      });
      notified++;
    }

    return {
      stale_applications: staleApps.length,
      reminders_sent: notified,
    };
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

      // Build better query from multiple filter fields
      const queryParts: string[] = [];
      if (filters.job_title) queryParts.push(filters.job_title as string);
      if (filters.keywords) queryParts.push(filters.keywords as string);
      if (filters.skill) queryParts.push(filters.skill as string);
      if (filters.technology) queryParts.push(filters.technology as string);
      const query = queryParts.join(" ") || "software engineer";

      const result = await step.run(`alert-${alert.id}`, async () => {
        const { jobs } = await discoverJobs({
          query,
          filters: filters as never,
          pageSize: 20, // Get more to filter better
        });

        // Filter out seen jobs and low-quality matches
        const fresh = jobs.filter((j) => {
          if (j.is_mock) return false;
          // Basic quality checks
          if (!j.title || !j.company) return false;
          if (j.title.length < 3 || j.company.length < 2) return false;
          return true;
        }).slice(0, 10); // More results for better selection

        if (!fresh.length) return 0;

        // Sort by relevance (published date, match score if available)
        const sorted = fresh.sort((a, b) => {
          const aDate = a.published_at ? new Date(a.published_at).getTime() : 0;
          const bDate = b.published_at ? new Date(b.published_at).getTime() : 0;
          return bDate - aDate; // Newest first
        });

        const topJobs = sorted.slice(0, 5);
        await prisma.notification.create({
          data: {
            user_id: alert.user_id,
            type: "alert",
            title: `Job alert: ${alert.name}`,
            message: `${topJobs.length} new opportunities match your saved search "${alert.name}".`,
            data: {
              jobs: topJobs.map((j) => ({
                id: j.external_id,
                title: j.title,
                company: j.company,
                url: j.application_url,
                location: j.location,
                salary: j.salary_min && j.salary_max
                  ? `${j.salary_currency ?? ""} ${j.salary_min.toLocaleString()} - ${j.salary_max.toLocaleString()}`
                  : null,
              })),
            },
          },
        });
        await prisma.searchAlert.update({
          where: { id: alert.id },
          data: { last_sent_at: new Date() },
        });
        return topJobs.length;
      });
      notified += result;
    }
    return {
      alerts_processed: alerts.length,
      notifications_sent: notified,
    };
  },
);
