/**
 * T036 [US1] — E2E: two users see only their own tasks (SC-002 100% isolation).
 *
 * Signs up user A, adds a task; logs out; signs up user B in the same
 * browser context; asserts B's main screen does not show A's task.
 */
import { test, expect } from '@playwright/test';

const randomEmail = (label: string) =>
  `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test.describe('US1 — data isolation', () => {
  test('user B cannot see user A\'s tasks', async ({ page }) => {
    const userA = randomEmail('a');
    const userB = randomEmail('b');
    const password = 'password123';

    // Sign up user A and add a task.
    await page.goto('/login');
    await page.getByRole('button', { name: /가입|sign up/i }).first().click();
    await page.getByLabel(/이메일/).fill(userA);
    await page.getByLabel(/비밀번호/).fill(password);
    await page.getByRole('button', { name: /가입/ }).click();
    await expect(page).toHaveURL(/\/main/);

    const addInputA = page.getByPlaceholder(/할 일|task/i).first();
    await addInputA.fill('A 전용 작업 데이터');
    await addInputA.press('Enter');
    await expect(page.getByText('A 전용 작업 데이터')).toBeVisible();

    // Log out — selector depends on the LogoutButton wiring (US2).
    // Falls back to clearing storage if no button found yet, to keep
    // this test runnable as soon as US1 is done.
    const logoutBtn = page.getByRole('button', { name: /로그아웃/ });
    if (await logoutBtn.count()) {
      await logoutBtn.click();
    } else {
      await page.context().clearCookies();
    }

    // Sign up user B.
    await page.goto('/login');
    await page.getByRole('button', { name: /가입|sign up/i }).first().click();
    await page.getByLabel(/이메일/).fill(userB);
    await page.getByLabel(/비밀번호/).fill(password);
    await page.getByRole('button', { name: /가입/ }).click();
    await expect(page).toHaveURL(/\/main/);

    // User B must NOT see user A's task anywhere on the main screen.
    await expect(page.getByText('A 전용 작업 데이터')).toHaveCount(0);
  });
});
