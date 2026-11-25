import { AdzunaProvider } from "@/services/providers/adzuna";
import { stripHtml } from "@/services/providers/http";
import { JoobleProvider } from "@/services/providers/jooble";
import { LeverProvider } from "@/services/providers/lever";
import { MockProvider } from "@/services/providers/mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const params = { query: "react developer", pageSize: 5 };

describe("MockProvider", () => {
  it("returns clearly-labelled demo jobs", async () => {
    const res = await new MockProvider().search(params);
    expect(res.mocked).toBe(true);
    expect(res.jobs.length).toBeGreaterThan(0);
    expect(res.jobs.every((j) => j.is_mock && j.source_name === "demo")).toBe(true);
    expect(res.jobs[0].description).toMatch(/DEMO/i);
  });
});

describe("AdzunaProvider", () => {
  beforeEach(() => {
    vi.stubEnv("ADZUNA_APP_ID", "");
    vi.stubEnv("ADZUNA_API_KEY", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("reports not configured without keys", async () => {
    const res = await new AdzunaProvider().search(params);
    expect(res.jobs).toHaveLength(0);
    expect(res.error).toMatch(/not configured/i);
  });
});

describe("JoobleProvider", () => {
  it("reports not configured without key", async () => {
    vi.stubEnv("JOOBLE_API_KEY", "");
    const res = await new JoobleProvider().search(params);
    expect(res.jobs).toHaveLength(0);
    expect(res.error).toMatch(/not configured/i);
    vi.unstubAllEnvs();
  });
});

describe("LeverProvider", () => {
  it("returns guidance when no company specified", async () => {
    vi.stubEnv("LEVER_COMPANY_SLUGS", "");
    const res = await new LeverProvider().search(params);
    expect(res.jobs).toHaveLength(0);
    expect(res.error).toMatch(/No Lever company/i);
    vi.unstubAllEnvs();
  });

  it("fetches postings for a company slug", async () => {
    vi.stubEnv("LEVER_COMPANY_SLUGS", "");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "1", text: "Backend Engineer", hostedUrl: "https://jobs.lever.co/acme/1", categories: { location: "Remote", commitment: "Full-time" }, createdAt: 1700000000000 }]), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await new LeverProvider().search({ query: "engineer", companyBoard: "acme" });
    expect(res.jobs).toHaveLength(1);
    expect(res.jobs[0].title).toBe("Backend Engineer");
    expect(res.jobs[0].remote_status).toBe("remote");
    expect(res.jobs[0].employment_type).toBe("full-time");
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});

describe("stripHtml", () => {
  it("removes tags and decodes entities", () => {
    expect(stripHtml("<p>Hello &amp; <b>world</b></p>")).toBe("Hello & world");
  });

  it("preserves paragraph and list structure", () => {
    const html = "<h2>About</h2><p>First paragraph.</p><ul><li>Item one</li><li>Item two</li></ul><p>Second&nbsp;para.</p>";
    const out = stripHtml(html);
    expect(out).toContain("About");
    expect(out).toContain("First paragraph.");
    expect(out).toContain("• Item one");
    expect(out).toContain("• Item two");
    expect(out).toContain("Second para.");
    expect(out).toContain("\n");
  });

  it("decodes numeric entities", () => {
    expect(stripHtml("Tom &amp; Jerry &#8212; fun")).toContain("—");
  });
});
