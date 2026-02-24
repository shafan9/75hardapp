import { chromium, expect } from '@playwright/test';

const baseUrl = process.env.PROD_BASE_URL || 'https://75-squad-challenge.netlify.app';
const inviteCode = process.env.PROD_INVITE_CODE || 'nVAQ6dEZ';

function nowId() {
  return String(Date.now());
}

async function createUser(email, password) {
  const res = await fetch(`${baseUrl}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName: 'Prod E2E',
      inviteCode,
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`createUser failed: ${res.status} ${(payload && payload.error) || ''}`);
  }

  return payload;
}

const run = async () => {
  const suffix = nowId();
  const email = `prod-e2e-${suffix}@example.com`;
  const password = `TestPass!${suffix}`;

  await createUser(email, password);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const joinUrl = `${baseUrl}/join/${inviteCode}`;
  await page.goto(joinUrl, { waitUntil: 'domcontentloaded' });

  // Wait for invite lookup + auth check.
  const loader = page.getByLabel('Loading invite');
  if (await loader.count()) {
    await loader.first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
  }

  // Sign in
  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // After auth, either auto-join may redirect directly to /dashboard, or the Join Squad button may appear.
  const joinButton = page.getByRole('button', { name: 'Join Squad' });
  const reachedDashboard = await page
    .waitForURL(/\/dashboard(\/.*)?$/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);

  if (!reachedDashboard) {
    const joiningButton = page.getByRole('button', { name: /joining/i });
    const isAutoJoining = await joiningButton
      .isVisible()
      .catch(() => false);

    if (isAutoJoining) {
      await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 60_000 });
    } else {
      await joinButton.waitFor({ state: 'visible', timeout: 60_000 });
      await joinButton.click();
      await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 60_000 });
    }
  }

  // Toggle two tasks and wait for UI to reflect the save before reloading.
  await page.getByRole('button', { name: /Mark Outdoor Workout as complete/i }).click();
  await page
    .getByRole('button', { name: /Mark Outdoor Workout as incomplete/i })
    .waitFor({ state: 'visible', timeout: 30_000 });

  await page.getByRole('button', { name: /Mark Gallon of Water as complete/i }).click();
  await page
    .getByRole('button', { name: /Mark Gallon of Water as incomplete/i })
    .waitFor({ state: 'visible', timeout: 30_000 });

  // Refresh and ensure tasks remain checked.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Today' }).waitFor({ state: 'visible', timeout: 30_000 });

  await page.getByRole('button', { name: /Mark Outdoor Workout as incomplete/i }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('button', { name: /Mark Gallon of Water as incomplete/i }).waitFor({ state: 'visible', timeout: 30_000 });

  // Sign out + sign back in from landing page.
  await page.getByRole('button', { name: /sign out/i }).click();
  await page.waitForURL(new RegExp(`${baseUrl.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}/?$`), { timeout: 30_000 }).catch(() => {});

  await page.locator('#auth-email').fill(email);
  await page.locator('#auth-password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 60_000 });

  // Ensure tasks still show as completed.
  await page.getByRole('button', { name: /Mark Outdoor Workout as incomplete/i }).waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByRole('button', { name: /Mark Gallon of Water as incomplete/i }).waitFor({ state: 'visible', timeout: 30_000 });

  // History/backfill smoke: if squad is past Day 1, edit a past day and confirm persistence.
  await page.goto(`${baseUrl}/dashboard/history`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Your Progress Timeline/i }).waitFor({ state: 'visible', timeout: 30_000 });

  const prevButton = page.getByRole('button', { name: 'Prev' });
  if (await prevButton.isEnabled().catch(() => false)) {
    await prevButton.click();
    await page.getByText(/Past day \(editable backfill\)/i).waitFor({ state: 'visible', timeout: 30_000 });

    const backfillToggle = page.getByRole('button', { name: /Mark Read 10 Pages as complete/i });
    if (await backfillToggle.count()) {
      await backfillToggle.first().click();
      await page.getByRole('button', { name: /Mark Read 10 Pages as incomplete/i }).waitFor({ state: 'visible', timeout: 30_000 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /Mark Read 10 Pages as incomplete/i }).waitFor({ state: 'visible', timeout: 30_000 });
    }
  }

  // Sanity: day label renders.
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: /Today/i }).waitFor({ state: 'visible', timeout: 30_000 });

  await browser.close();
  console.log('prod-e2e: OK');
};

run().catch((err) => {
  console.error('prod-e2e: FAILED', err);
  process.exit(1);
});
