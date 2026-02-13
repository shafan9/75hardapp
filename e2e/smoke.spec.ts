import { test, expect } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL?.trim();
const password = process.env.E2E_USER_PASSWORD?.trim();

test.describe("75 Squad smoke", () => {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run smoke tests.");

  test("auth -> create squad (if needed) -> complete tasks -> see squad status", async ({ page }) => {
    const squadName = `E2E Squad ${Date.now()}`;
    const requiredTasks = [
      "Outdoor Workout",
      "Second Workout",
      "Follow Diet",
      "Gallon of Water",
      "Read 10 Pages",
    ];

    await page.goto("/auth/test-login");
    await expect(page.getByRole("heading", { name: "E2E Test Login" })).toBeVisible();

    // The form is disabled until hydration.
    await expect(page.getByTestId("hydrated")).toBeVisible();

    const emailInput = page.locator("#test-login-email");
    const passwordInput = page.locator("#test-login-password");

    await expect(emailInput).toBeEnabled();

    await emailInput.click();
    await emailInput.fill(email!);

    await passwordInput.click();
    await passwordInput.fill(password!);

    await Promise.all([
      page.waitForURL(/\/dashboard(\/.*)?$/, { waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: "Sign In" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

    // Create squad if the user doesn't have one yet.
    const createInput = page.locator("#squad-name");
    if (await createInput.isVisible()) {
      await createInput.fill(squadName);
      await page.getByRole("button", { name: "Create Squad" }).click();
      await expect(page.getByText(`Invite to ${squadName}`)).toBeVisible();
    } else {
      await expect(page.getByText(/Invite to /)).toBeVisible();
    }

    // Complete required tasks (idempotent).
    for (const taskLabel of requiredTasks) {
      const markComplete = page.locator(`button[aria-label="Mark ${taskLabel} as complete"]`);
      if ((await markComplete.count()) > 0) {
        await expect(markComplete.first()).toBeVisible();
        await markComplete.first().click();
      }
    }

    await expect(page.getByText(/ALL TASKS DONE!/i)).toBeVisible();

    // Squad status updates should show at least one DONE badge.
    await expect(page.getByText("DONE", { exact: true })).toBeVisible();
  });
});
