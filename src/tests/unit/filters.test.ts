import { describe, expect, it } from "vitest";
import {
  applyFilters,
  normEmploymentType,
  normExperienceLevel,
  normRemoteStatus,
} from "@/services/job-discovery";
import type { ProviderJob } from "@/services/providers/types";

function job(overrides: Partial<ProviderJob>): ProviderJob {
  return {
    external_id: "x",
    title: "Software Engineer",
    company: "Acme",
    location: "Berlin",
    country: "Germany",
    description: "Build things with React and Node",
    application_url: "https://example.com/apply",
    source_name: "test",
    source_url: "https://example.com",
    ...overrides,
  } as ProviderJob;
}

describe("normEmploymentType", () => {
  it("normalizes provider variants to canonical values", () => {
    expect(normEmploymentType("Full Time")).toBe("full-time");
    expect(normEmploymentType("full_time")).toBe("full-time");
    expect(normEmploymentType("Permanent")).toBe("full-time");
    expect(normEmploymentType("Part-Time")).toBe("part-time");
    expect(normEmploymentType("Contract")).toBe("contract");
    expect(normEmploymentType("Freelance")).toBe("freelance");
    expect(normEmploymentType("Internship")).toBe("internship");
    expect(normEmploymentType("Temporary")).toBe("temporary");
  });
});

describe("normRemoteStatus", () => {
  it("normalizes onsite variants", () => {
    expect(normRemoteStatus("Onsite")).toBe("on-site");
    expect(normRemoteStatus("on_site")).toBe("on-site");
    expect(normRemoteStatus("Office")).toBe("on-site");
    expect(normRemoteStatus("Remote")).toBe("remote");
    expect(normRemoteStatus("WFH")).toBe("remote");
    expect(normRemoteStatus("Hybrid")).toBe("hybrid");
  });
});

describe("normExperienceLevel", () => {
  it("maps coarse provider levels", () => {
    expect(normExperienceLevel("executive")).toBe("director");
    expect(normExperienceLevel("VP Engineering")).toBe("director");
    expect(normExperienceLevel("staff engineer")).toBe("lead");
    expect(normExperienceLevel("senior")).toBe("senior");
    expect(normExperienceLevel("entry level")).toBe("entry");
    expect(normExperienceLevel("graduate")).toBe("entry");
  });
});

describe("applyFilters — enum matching", () => {
  const jobs = [
    job({ employment_type: "Full Time", remote_status: "Onsite" as ProviderJob["remote_status"], experience_level: "executive" }),
    job({ external_id: "y", employment_type: "part_time", remote_status: "remote", experience_level: "entry" }),
  ];

  it("matches employment_type across provider formats", () => {
    const out = applyFilters(jobs, { employment_type: ["full-time"] });
    expect(out).toHaveLength(1);
    expect(out[0].external_id).toBe("x");
  });

  it("matches remote_status variants", () => {
    const out = applyFilters(jobs, { remote_status: ["on-site"] });
    expect(out).toHaveLength(1);
    expect(out[0].external_id).toBe("x");
  });

  it("matches experience_level via canonical mapping", () => {
    const out = applyFilters(jobs, { experience_level: ["director"] });
    expect(out).toHaveLength(1);
    expect(out[0].external_id).toBe("x");
  });

  it("keeps jobs with unknown enum values", () => {
    const out = applyFilters(
      [job({ employment_type: null, remote_status: null, experience_level: null })],
      {
        employment_type: ["full-time"],
        remote_status: ["remote"],
        experience_level: ["senior"],
      },
    );
    expect(out).toHaveLength(1);
  });
});
