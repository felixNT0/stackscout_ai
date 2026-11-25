import { expect, test } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows hero content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/StackScout/i);
    await expect(page.locator("h1")).toBeVisible();
  });

  test("shows sign-in and sign-up links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a[href="/auth/signin"]').first()).toBeVisible();
    await expect(page.locator('a[href="/auth/signup"]').first()).toBeVisible();
  });

  test("navigates to features page", async ({ page }) => {
    await page.goto("/");
    // Footer link is always visible; click the last match
    await page.locator('a[href="/features"]').last().click();
    await expect(page).toHaveURL(/\/features/);
  });

  test("search redirects to dashboard or signin", async ({ page }) => {
    await page.goto("/");
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("react developer");
      await searchInput.press("Enter");
      // Should redirect to signin (unauthenticated) or dashboard search
      await expect(page).toHaveURL(/\/(auth\/signin|dashboard\/search)/);
    }
  });
});
