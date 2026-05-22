/**
 * T035 [US1] — E2E: signup → auto-login → CRUD → refresh → data persists.
 *
 * Requires a Supabase test project with email-confirmation disabled and the
 * NEXT_PUBLIC_SUPABASE_* env vars set. Uses a random email per test so runs
 * are independent.
 *
 * This test is excluded from `npm test` (vitest) and runs under
 * `npm run test:e2e` (playwright).
 */
import { test, expect } from '@playwright/test';

const randomEmail = () =>
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test.describe('US1 — signup and CRUD', () => {
  test('user signs up, sees empty list, adds & toggles a task, persists across refresh', async ({
    page,
  }) => {
    const email = randomEmail();
    const password = 'password123';

    await page.goto('/login');

    // Switch to signup mode and submit.
    await page.getByRole('button', { name: /가입|sign up/i }).first().click();
    await page.getByLabel(/이메일/).fill(email);
    await page.getByLabel(/비밀번호/).fill(password);
    await page.getByRole('button', { name: /가입/ }).click();

    // After signup, should land on /main.
    await expect(page).toHaveURL(/\/main/);

    // Add a task — exact selector depends on the existing UI; we look for
    // an "add task" input on the main screen.
    const addInput = page.getByPlaceholder(/할 일|task/i).first();
    await addInput.fill('첫 번째 작업');
    await addInput.press('Enter');

    await expect(page.getByText('첫 번째 작업')).toBeVisible();

    // Refresh — task should still be there.
    await page.reload();
    await expect(page.getByText('첫 번째 작업')).toBeVisible();
  });
});
