import { chromium } from '@playwright/test';

const baseUrl = 'https://75-squad-challenge.netlify.app';
const inviteCode = process.env.PROD_SMOKE_INVITE_CODE || 'nVAQ6dEZ';
const email = process.env.PROD_SMOKE_EMAIL;
const password = process.env.PROD_SMOKE_PASSWORD;

if (!email || !password) {
  console.error('Set PROD_SMOKE_EMAIL and PROD_SMOKE_PASSWORD');
  process.exit(2);
}

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const joinUrl = `${baseUrl}/join/${inviteCode}`;
  await page.goto(joinUrl, { waitUntil: 'domcontentloaded' });

  // Wait for the invite page to finish its initial auth + invite lookup.
  const loader = page.getByLabel('Loading invite');
  if (await loader.count()) {
    await loader.first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
  }

  const joinButton = page.getByRole('button', { name: 'Join Squad' });
  const emailField = page.locator('#auth-email');
  const authError = page.locator('.text-accent-red');

  console.log('prod-smoke: loaded', joinUrl);

  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(email);
    await page.locator('#auth-password').fill(password);

    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for either join button or an auth error.
    await Promise.race([
      joinButton.waitFor({ state: 'visible', timeout: 60_000 }),
      authError.waitFor({ state: 'visible', timeout: 60_000 }),
    ]);

    if (await authError.isVisible().catch(() => false)) {
      const text = (await authError.first().innerText().catch(() => '')).trim();
      await page.screenshot({ path: 'test-results/prod-smoke-auth-error.png', fullPage: true });
      throw new Error(`Sign-in error: ${text || '(unknown)'}`);
    }
  }

  await joinButton.waitFor({ state: 'visible', timeout: 60_000 });
  await joinButton.click();

  await page.waitForURL(/\/dashboard(\/.*)?$/, { timeout: 60_000 });
  await page.getByRole('heading', { name: 'Today' }).waitFor({ state: 'visible', timeout: 30_000 });

  const membershipError = page.getByText(/could not load group membership/i);
  if (await membershipError.count()) {
    await page.screenshot({ path: 'test-results/prod-smoke-membership-error.png', fullPage: true });
    throw new Error('Dashboard shows membership error');
  }

  await browser.close();
  console.log('prod-smoke: OK');
};

run().catch((err) => {
  console.error('prod-smoke: FAILED', err);
  process.exit(1);
});
