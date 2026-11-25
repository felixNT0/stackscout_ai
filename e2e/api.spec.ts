import { expect, test } from "@playwright/test";

test.describe("API health", () => {
  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("status");
  });

  test("unauthenticated API returns 401", async ({ request }) => {
    const res = await request.get("/api/applications");
    expect(res.status()).toBe(401);
  });

  test("notifications endpoint requires auth", async ({ request }) => {
    const res = await request.get("/api/notifications");
    expect(res.status()).toBe(401);
  });
});
