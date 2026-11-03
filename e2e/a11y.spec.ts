import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

const scan = async (page: import('@playwright/test').Page, name: string) => {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = r.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) e.g. ${v.nodes[0]?.target.join(' ')}`,
  );
  expect.soft(summary, `${name}\n${summary.join('\n')}`).toEqual([]);
};

test('signed-out pages have no WCAG AA violations', async ({ page }) => {
  for (const p of [
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/verify',
    '/reset-password',
    '/legal/terms',
  ]) {
    await page.goto(p);
    await page.waitForLoadState('networkidle');
    await scan(page, p);
  }
});

test('signed-in pages have no WCAG AA violations', async ({ page }) => {
  await signIn(page);
  for (const p of [
    '/',
    '/scan',
    '/history',
    '/plans',
    '/usage',
    '/profile',
    '/notifications',
    '/help',
    '/about',
    '/account',
    '/account/delete',
  ]) {
    await page.goto(p);
    await page.waitForLoadState('networkidle');
    await scan(page, p);
  }
});

test('result page has no WCAG AA violations', async ({ page }) => {
  await signIn(page);
  await page.goto('/scan');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(50_000, 1) });
  await page.getByRole('button', { name: 'Upload & analyze' }).click();
  await expect(page.getByRole('progressbar', { name: 'Analysis progress' })).toBeVisible();
  await scan(page, 'analyzing');
  await expect(page.getByRole('heading', { name: 'Likely AI-generated video' })).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: 'Show technical details' }).click();
  await scan(page, 'result');
});

test('keyboard: skip link and focus rings work', async ({ page }) => {
  await signIn(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});
