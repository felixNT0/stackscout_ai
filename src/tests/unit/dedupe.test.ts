import { describe, it, expect } from "vitest";
import { dedupeJobs, normalizeUrl, fingerprintId } from "@/lib/jobs/dedupe";
import type { ProviderJob } from "@/services/providers/types";

const base: ProviderJob = {
  external_id: null,
  title: "Senior React Developer",
  company: "Acme Inc",
  description: "Build web apps",
  application_url: "https://acme.com/careers/123?utm_source=x",
  source_name: "adzuna",
};

describe("normalizeUrl", () => {
  it("strips tracking params and trailing slash", () => {
    expect(normalizeUrl("https://acme.com/jobs/1/?utm_source=a&ref=b")).toBe("https://acme.com/jobs/1");
  });
  it("returns lowercase for invalid urls", () => {
    expect(normalizeUrl("Not A URL")).toBe("not a url");
  });
});

describe("dedupeJobs", () => {
  it("dedupes by normalized application URL", () => {
    const a = { ...base };
    const b = { ...base, source_name: "jooble", application_url: "https://acme.com/careers/123" };
    const out = dedupeJobs([a, b]);
    expect(out).toHaveLength(1);
    expect(out[0].raw).toMatchObject({ sources: expect.arrayContaining(["adzuna", "jooble"]) });
  });

  it("dedupes by fingerprint when urls differ", () => {
    const a = { ...base, application_url: "https://a.com/1" };
    const b = { ...base, application_url: "https://b.com/2", source_name: "tavily" };
    const out = dedupeJobs([a, b]);
    expect(out).toHaveLength(1);
  });

  it("prefers non-mock over mock", () => {
    const real = { ...base, application_url: "https://real.com/j1", is_mock: false };
    const mock = { ...base, application_url: "https://real.com/j1?x=1", is_mock: true, source_name: "demo" };
    const out = dedupeJobs([mock, real]);
    expect(out[0].is_mock).toBeFalsy();
  });

  it("skips jobs missing title or url", () => {
    const out = dedupeJobs([{ ...base, title: "" }, { ...base, application_url: "" }]);
    expect(out).toHaveLength(0);
  });
});

describe("fingerprintId", () => {
  it("is stable for same job", () => {
    expect(fingerprintId(base)).toBe(fingerprintId({ ...base }));
  });
});
