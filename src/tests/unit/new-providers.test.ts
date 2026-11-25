import { describe, expect, it } from "vitest";
import { AshbyProvider } from "../../services/providers/ashby";
import { RemoteBackendJobsProvider } from "../../services/providers/remotebackendjobs";
import { TheMuseProvider } from "../../services/providers/themuse";

describe("TheMuseProvider", () => {
  const provider = new TheMuseProvider();

  it("is always configured (free API)", () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it("has correct name", () => {
    expect(provider.name).toBe("TheMuse");
  });

  it("returns ProviderSearchResult shape", async () => {
    const result = await provider.search({
      query: "software engineer",
      page: 1,
      pageSize: 10,
    });

    expect(result).toHaveProperty("provider");
    expect(result).toHaveProperty("jobs");
    expect(Array.isArray(result.jobs)).toBe(true);
  }, 15000); // Increased timeout for slow API

  it("handles API errors gracefully", async () => {
    // This will fail if network is unavailable, but should not throw
    const result = await provider.search({
      query: "test",
      page: 1,
      pageSize: 5,
    });

    expect(result.provider).toBe("TheMuse");
    expect(Array.isArray(result.jobs)).toBe(true);
  });
});

describe("RemoteBackendJobsProvider", () => {
  const provider = new RemoteBackendJobsProvider();

  it("is always configured (free API)", () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it("has correct name", () => {
    expect(provider.name).toBe("RemoteBackendJobs");
  });

  it("returns ProviderSearchResult shape", async () => {
    const result = await provider.search({
      query: "backend",
      page: 1,
      pageSize: 10,
    });

    expect(result).toHaveProperty("provider");
    expect(result).toHaveProperty("jobs");
    expect(Array.isArray(result.jobs)).toBe(true);
  });
});

describe("AshbyProvider", () => {
  const provider = new AshbyProvider();

  it("is always configured (public API)", () => {
    expect(provider.isConfigured()).toBe(true);
  });

  it("has correct name", () => {
    expect(provider.name).toBe("Ashby");
  });

  it("returns ProviderSearchResult shape", async () => {
    const result = await provider.search({
      query: "engineer",
      page: 1,
      pageSize: 10,
    });

    expect(result).toHaveProperty("provider");
    expect(result).toHaveProperty("jobs");
    expect(Array.isArray(result.jobs)).toBe(true);
  });
});
