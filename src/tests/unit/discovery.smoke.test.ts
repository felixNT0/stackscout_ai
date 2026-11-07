import { describe, it, expect } from "vitest";
import { discoverJobs } from "@/services/job-discovery";

describe("live provider smoke", () => {
  it.skipIf(!process.env.RUN_LIVE_TESTS)("returns real jobs from public providers", async () => {
    const { jobs, providerResults, usedMock } = await discoverJobs({
      query: "react developer",
      pageSize: 10,
    });
    console.log(
      providerResults.map((r) => `${r.provider}: ${r.jobs.length} jobs ${r.error ? "ERR " + r.error : ""}`),
    );
    console.log("total deduped:", jobs.length, "usedMock:", usedMock);
    expect(usedMock).toBe(false);
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].published_at).toBeTruthy();
  }, 60000);
});
