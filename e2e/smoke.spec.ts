import { test, expect } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe("75 Squad smoke", () => {
  test.skip(!email || !password, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run smoke tests.");

  test("auth -> create/join group -> complete tasks -> feed + leaderboard", async ({ page }) => {
    const squadName = `E2E Squad ${Date.now()}`;
    const requiredTasks = [
      "Outdoor Workout",
      "Second Workout",
      "Follow Diet",
      "Gallon of Water",
      "Read 10 Pages",
    ];
    const commentText = `E2E comment ${Date.now()}`;

    await page.goto("/auth/test-login");
    await expect(page.getByRole("heading", { name: "E2E Test Login" })).toBeVisible();

    await page.locator('input[type="email"]').fill(email!);
    await page.locator('input[type="password"]').fill(password!);

    await Promise.all([
      page.waitForURL(/\/dashboard(\/.*)?$/),
      page.getByRole("button", { name: "Sign In" }).click(),
    ]);

    await page.goto("/dashboard/group");

    const createInput = page.getByPlaceholder("Squad name");
    if (await createInput.isVisible()) {
      await createInput.fill(squadName);
      await page.getByRole("button", { name: "Create Squad" }).click();
      await expect(page.getByText(squadName)).toBeVisible();
    } else {
      await expect(page.getByText("Squad Members")).toBeVisible();
    }

    await page.goto("/dashboard");
    await expect(page.getByText("Daily Motivation")).toBeVisible();

    for (const taskLabel of requiredTasks) {
      const completeButton = page.locator(
        `button[aria-label="Mark ${taskLabel} as complete"]`
      );
      if ((await completeButton.count()) > 0) {
        await completeButton.first().click();
      }
    }

    await expect(page.getByText(/ALL TASKS DONE!/i)).toBeVisible();

    await page.goto("/dashboard/feed");
    await expect(page.getByText(/Live activity from your group/i)).toBeVisible();

    const feedCard = page.locator(".glass-card", { hasText: "Completed" }).first();
    await expect(feedCard).toBeVisible();

    await feedCard.getByRole("button", { name: "React with 🔥" }).click();
    await feedCard.getByRole("button", { name: "Open comments" }).click();

    await page.getByPlaceholder("Write a comment…").fill(commentText);
    await page.getByRole("button", { name: "Send comment" }).click();
    await expect(page.getByText(commentText)).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/dashboard/leaderboard");
    await expect(page.getByText("Overall Rankings")).toBeVisible();
    await expect(page.locator('[data-testid="ranking-row"]').first()).toBeVisible();
    await expect(page.getByText("5/5")).toBeVisible();
  });
});
