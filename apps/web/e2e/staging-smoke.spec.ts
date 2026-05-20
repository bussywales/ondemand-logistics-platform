import { expect, Page, test } from '@playwright/test';
import { buildAuthRedirectTarget } from '../app/_lib/route-protection';

const PUBLIC_RESTAURANT_PATH = '/restaurants/pilot-kitchen-1777370757';
const LATEST_ORDER_ID = process.env.SMOKE_LATEST_ORDER_ID || process.env.LATEST_ORDER_ID;

const BUSINESS_TEST_ACCOUNT = {
  email: process.env.SMOKE_BUSINESS_EMAIL || process.env.BUSINESS_SMOKE_EMAIL || '',
  password: process.env.SMOKE_BUSINESS_PASSWORD || process.env.BUSINESS_SMOKE_PASSWORD || ''
};

const ADMIN_TEST_ACCOUNT = {
  email: process.env.SMOKE_ADMIN_EMAIL || process.env.ADMIN_SMOKE_EMAIL || '',
  password: process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_SMOKE_PASSWORD || ''
};

const DRIVER_TEST_ACCOUNT = {
  email: process.env.SMOKE_DRIVER_EMAIL || process.env.DRIVER_SMOKE_EMAIL || '',
  password: process.env.SMOKE_DRIVER_PASSWORD || process.env.DRIVER_SMOKE_PASSWORD || ''
};

const FLEET_MANAGER_TEST_ACCOUNT = {
  email: process.env.SMOKE_FLEET_MANAGER_EMAIL || '',
  password: process.env.SMOKE_FLEET_MANAGER_PASSWORD || ''
};

async function signInOperator(page: Page, credentials: { email: string; password: string }, options?: { returnTo?: string }) {
  if (!credentials.email || !credentials.password) {
    return false;
  }

  const target = options?.returnTo ? buildAuthRedirectTarget({ pathname: options.returnTo }) : '/get-started';
  await page.goto(target, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

  const signInMode = page.getByRole('button', { name: /^sign in$/i }).first();
  if (await signInMode.isVisible({ timeout: 10000 }).catch(() => false)) {
    await signInMode.click();
  }
  const signInCopy = page.getByText(/sign in with the existing operator account/i);
  if (!(await signInCopy.isVisible({ timeout: 1000 }).catch(() => false))) {
    const switchToSignIn = page.getByRole('button', { name: /switch to sign in/i }).first();
    if (await switchToSignIn.isVisible().catch(() => false)) {
      await switchToSignIn.click();
    }
  }
  await expect(signInCopy).toBeVisible({ timeout: 5000 });

  await page.getByRole('textbox', { name: /email/i }).fill(credentials.email);
  await page.getByRole('textbox', { name: /password/i }).fill(credentials.password);
  await page.getByRole('button', { name: /continue to business setup/i }).click();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.waitForLoadState('domcontentloaded');

    const url = page.url();
    if (!url.includes('/get-started')) {
      return true;
    }

    const errorVisible = await page.locator('.form-error').isVisible();
    if (errorVisible) {
      return false;
    }

    await page.waitForTimeout(500);
  }

  return false;
}

async function assertProtectedRouteLoads(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: 'domcontentloaded' });

  if (response) {
    expect(response.status(), `GET ${path}`).toBeLessThan(500);
  }

  await expect(page.locator('main').first()).toBeVisible({ timeout: 12000 });
  expect(page.url()).not.toContain('/get-started');
}

test('public ordering smoke with checkout surface', async ({ page }) => {
  await page.goto(PUBLIC_RESTAURANT_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: /loading menu/i })).toBeHidden({ timeout: 30000 });
  await expect(page.getByRole('heading', { name: /mains/i })).toBeVisible({ timeout: 30000 });

  const firstAddButton = page.getByRole('button', { name: /^Add/i }).first();
  await expect(firstAddButton).toBeVisible({ timeout: 30000 });
  await firstAddButton.click();

  const checkoutButton = page.getByRole('button', { name: /continue to checkout/i });
  await expect(checkoutButton).toBeEnabled({ timeout: 15000 });
  await checkoutButton.click();

  await expect(
    page.getByRole('heading', { name: /(authorize payment|checkout|payment)/i })
  ).toBeVisible({ timeout: 15000 });

  const cardElement = page.locator('.payment-card-element');
  const fallbackState = page.getByText(/Stripe frontend is not configured/i);
  await expect(cardElement.or(fallbackState)).toBeVisible({ timeout: 20000 });

  if (await cardElement.isVisible()) {
    await expect(cardElement).toBeVisible();
  } else {
    await expect(fallbackState).toBeVisible();
  }
});

test('public tracking smoke opens latest order', async ({ page }) => {
  test.skip(!LATEST_ORDER_ID, 'Set SMOKE_LATEST_ORDER_ID to smoke the public tracking route.');

  await page.goto(`/track/${LATEST_ORDER_ID}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByRole('heading', { name: /(tracking|order status|delivery status)/i })
  ).toBeVisible({ timeout: 10000 });
});

test('public demo request page smoke', async ({ page }) => {
  await page.goto('/demo/request', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /guided shipwright operations walkthrough/i })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: /submit demo request/i })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Requests are recorded for admin review/i)).toBeVisible();
});

test('authenticated business workspace routes smoke', async ({ page }) => {
  test.skip(
    !BUSINESS_TEST_ACCOUNT.email || !BUSINESS_TEST_ACCOUNT.password,
    'Set SMOKE_BUSINESS_EMAIL and SMOKE_BUSINESS_PASSWORD for authenticated workspace smoke.'
  );

  const signedIn = await signInOperator(page, BUSINESS_TEST_ACCOUNT);
  expect(signedIn, 'Business smoke credentials should sign in when configured.').toBe(true);

  const routes = ['/app', '/app/orders', '/app/payments', '/app/reports/end-of-day', '/app/settings/team'];
  for (const route of routes) {
    await assertProtectedRouteLoads(page, route);
  }

  await page.goto('/app/orders');
  const firstOrder = page.locator('a[href^="/app/orders/"]').first();
  if (await firstOrder.isVisible()) {
    await firstOrder.click();
    await assertProtectedRouteLoads(page, page.url());
  }
});

test('authenticated admin routes smoke', async ({ page }) => {
  test.skip(!ADMIN_TEST_ACCOUNT.email || !ADMIN_TEST_ACCOUNT.password, 'Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD for admin smoke.');

  const signedIn = await signInOperator(page, ADMIN_TEST_ACCOUNT);
  expect(signedIn, 'Admin smoke credentials should sign in when configured.').toBe(true);

  await assertProtectedRouteLoads(page, '/admin');
  await assertProtectedRouteLoads(page, '/admin/command');
  await assertProtectedRouteLoads(page, '/admin/users');
  await assertProtectedRouteLoads(page, '/admin/orgs');
  await assertProtectedRouteLoads(page, '/admin/fleets');
  await assertProtectedRouteLoads(page, '/admin/demo-requests');
  await assertProtectedRouteLoads(page, '/admin/operational-resets');
  await assertProtectedRouteLoads(page, '/admin/pilots');
  const rehearsalLink = page.locator('a[href*="/admin/pilots/"][href$="/rehearsal"]').first();
  if (await rehearsalLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await rehearsalLink.click();
    await assertProtectedRouteLoads(page, page.url());
  }
  await assertProtectedRouteLoads(page, '/admin/drivers');
});

test('authenticated driver route smoke', async ({ page }) => {
  test.skip(!DRIVER_TEST_ACCOUNT.email || !DRIVER_TEST_ACCOUNT.password, 'Set SMOKE_DRIVER_EMAIL and SMOKE_DRIVER_PASSWORD for driver smoke.');

  const signedIn = await signInOperator(page, DRIVER_TEST_ACCOUNT, { returnTo: '/driver' });
  expect(signedIn, 'Driver smoke credentials should sign in when configured.').toBe(true);

  await assertProtectedRouteLoads(page, '/driver');

  const response = await page.goto('/fleet', { waitUntil: 'domcontentloaded' });
  if (response) {
    expect(response.status(), 'GET /fleet for ordinary driver').toBeLessThan(500);
  }
  await expect(page.getByRole('heading', { name: /fleet manager access required/i })).toBeVisible({ timeout: 12000 });
});

test('authenticated fleet manager workspace smoke', async ({ page }) => {
  test.skip(
    !FLEET_MANAGER_TEST_ACCOUNT.email || !FLEET_MANAGER_TEST_ACCOUNT.password,
    'Set SMOKE_FLEET_MANAGER_EMAIL and SMOKE_FLEET_MANAGER_PASSWORD for dedicated fleet manager smoke.'
  );

  const signedIn = await signInOperator(page, FLEET_MANAGER_TEST_ACCOUNT, { returnTo: '/fleet' });
  expect(signedIn, 'Fleet manager smoke credentials should sign in when configured.').toBe(true);

  await assertProtectedRouteLoads(page, '/fleet');
  await expect(page.getByText('Fleet readiness', { exact: true }).first()).toBeVisible({ timeout: 12000 });
  await expect(page.getByRole('heading', { name: /Fleet-managed couriers/i })).toBeVisible({ timeout: 12000 });
  await expect(page.getByText(/No scoring, suspension, billing, payout, or dispatch preference automation/i)).toBeVisible();
});
