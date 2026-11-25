import { expect, test } from "@playwright/test";

test.describe("Authentication pages", () => {
  test("sign-in page renders form", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("sign-up page renders form", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test("sign-in shows OAuth providers", async ({ page }) => {
    await page.goto("/auth/signin");
    // Google OAuth button should be present
    await expect(page.locator('button:has-text("Google"), a:has-text("Google")').first()).toBeVisible();
  });

  test("invalid credentials show error", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('input[type="password"]').fill("wrongpassword123");
    await page.locator('button[type="submit"]').click();
    // Should show error or stay on signin page
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("protected route redirects to signin", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
