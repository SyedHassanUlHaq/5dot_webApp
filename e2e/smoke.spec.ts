import { expect, test } from '@playwright/test';
import { signIn, trackCspViolations } from './helpers';

test('sign in → upload → analyzing → result → history → sign out (no CSP violations)', async ({
  page,
}) => {
  const csp = trackCspViolations(page);

  // Signed-out users are sent to sign-in and come back after.
  await page.goto('/history');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fhistory/);

  // Wrong password shows the backend message.
  await page.getByLabel('Email').fill('demo@5dot.test');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByText('Incorrect email or password.')).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();

  await signIn(page);

  // Upload (goes straight to the backend: exercises CORS + connect-src).
  await page.getByRole('link', { name: 'Analyze now' }).click();
  await expect(page.getByRole('heading', { name: 'New analysis' })).toBeVisible();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(200_000, 1) });
  await expect(page.getByText('clip.mp4')).toBeVisible();
  await page.getByRole('button', { name: 'Upload & analyze' }).click();

  // Analyzing → result (single route).
  await expect(page).toHaveURL(/\/scan\/s_\d+/);
  await expect(page.getByRole('progressbar', { name: 'Analysis progress' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Likely AI-generated video' })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('img', { name: /Likely AI, score 82%/ })).toBeVisible();
  await expect(page.getByText('Automated result, not a guarantee.')).toBeVisible();

  // Technical details toggle shows the timeline.
  await page.getByRole('button', { name: 'Show technical details' }).click();
  await expect(page.getByText('Score over time')).toBeVisible();

  // The scan appears in the dashboard.
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('clip.mp4').first()).toBeVisible();

  // Sign out returns to sign-in and protects the app again.
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto('/history');
  await expect(page).toHaveURL(/\/sign-in/);

  expect(csp, `CSP violations:\n${csp.join('\n')}`).toEqual([]);
});

test('a URL scan works and tokens are never readable by page JS', async ({ page }) => {
  await signIn(page);
  await page.goto('/scan');
  await page.getByRole('tab', { name: 'Paste a link' }).click();
  await page.getByRole('textbox', { name: 'Link' }).fill('https://www.youtube.com/watch?v=abc');
  await page.getByRole('button', { name: 'Analyze URL' }).click();
  await expect(page).toHaveURL(/\/scan\/s_\d+/);

  // httpOnly: neither cookie is visible to document.cookie, and nothing token-like is in storage.
  const leak = await page.evaluate(() => ({
    cookie: document.cookie,
    storage: JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }),
  }));
  expect(leak.cookie).not.toMatch(/5dot_(rt|at)/);
  expect(leak.storage).not.toMatch(/\bat_\d+|\brt_\d+|accessToken|refreshToken/);
  const cookies = await page.context().cookies();
  expect(
    cookies
      .filter((c) => c.name.startsWith('5dot_'))
      .every((c) => c.httpOnly && c.sameSite === 'Lax'),
  ).toBe(true);
});

test('unknown pages show the 404 screen', async ({ page }) => {
  await page.goto('/sign-in');
  const res = await page.goto('/definitely-not-here');
  // Signed-out users are redirected to sign-in by middleware before routing; signed-in users get the 404 page.
  expect(res?.status()).toBeLessThan(500);
  await signIn(page);
  await page.goto('/definitely-not-here');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('Chrome reports no CSP issues (e.g. eval) on key pages', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const issues: string[] = [];
  cdp.on('Audits.issueAdded', ({ issue }) => {
    if (issue.code === 'ContentSecurityPolicyIssue') {
      const d = issue.details.contentSecurityPolicyIssueDetails;
      issues.push(
        `${d?.violatedDirective} ${d?.contentSecurityPolicyViolationType} ${d?.sourceCodeLocation?.url ?? ''}`,
      );
    }
  });
  await cdp.send('Audits.enable');
  for (const p of ['/sign-in', '/sign-up', '/forgot-password']) {
    await page.goto(p);
    await page.waitForLoadState('networkidle');
  }
  await signIn(page);
  for (const p of ['/', '/scan', '/history', '/plans', '/profile', '/help']) {
    await page.goto(p);
    await page.waitForLoadState('networkidle');
  }
  expect(issues, issues.join('\n')).toEqual([]);
});
