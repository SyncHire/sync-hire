/**
 * E2E Smoke Tests
 *
 * Basic smoke tests to verify critical pages load correctly.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should display the landing page with CTA", async ({ page }) => {
    await page.goto("/");

    // Verify "Get Started" CTA button is visible
    await expect(
      page.getByRole("link", { name: /get started/i }).first()
    ).toBeVisible();
  });

  test("should have sign in link in header", async ({ page }) => {
    await page.goto("/");

    // Verify Sign In link is visible
    await expect(
      page.getByRole("link", { name: /sign in/i }).first()
    ).toBeVisible();
  });
});

test.describe("Authentication Pages", () => {
  test("should display the login page with form", async ({ page }) => {
    await page.goto("/login");

    // Verify email input exists
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Verify password input exists
    await expect(page.getByLabel(/password/i)).toBeVisible();

    // Verify sign in button exists
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });

  test("should display the signup page with form", async ({ page }) => {
    await page.goto("/signup");

    // Verify form exists with email field
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Verify submit button exists
    await expect(
      page.getByRole("button", { name: /sign up|create|get started/i })
    ).toBeVisible();
  });
});

test.describe("Protected Routes", () => {
  test("should redirect to login when accessing HR pages unauthenticated", async ({
    page,
  }) => {
    await page.goto("/hr/jobs");

    // Should redirect to login - verify login form is shown
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });
});
