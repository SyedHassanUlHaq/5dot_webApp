import { expect, type Page } from '@playwright/test';

export async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill('demo@5dot.test');
  await page.getByLabel('Password', { exact: true }).fill('pw');
  await page.getByRole('button', { name: /sign in/i }).click();
  // New accounts land on "/" and are then redirected client-side to the terms gate: wait for whichever shows up.
  const agree = page.getByRole('button', { name: 'I agree, continue' });
  const home = page.getByRole('heading', { name: /verify something/i });
  await expect(agree.or(home)).toBeVisible();
  if (await agree.isVisible()) await agree.click();
  await expect(home).toBeVisible();
}

/** Fails the test on any Content-Security-Policy violation reported in the console. */
export function trackCspViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to (load|execute|connect|apply)/i.test(m.text()))
      violations.push(m.text());
  });
  return violations;
}
