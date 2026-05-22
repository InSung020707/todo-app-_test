/**
 * LoginScreen integrates SignInForm / SignUpForm with a mode toggle.
 *
 * The form-submission behavior is covered by SignInForm.test.tsx and
 * SignUpForm.test.tsx; this file only verifies the LoginScreen-level
 * concerns: hero rendering, default mode, and the mode toggle.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/data/auth', () => ({
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
}));

import { LoginScreen } from '@/components/login/LoginScreen';

describe('LoginScreen', () => {
  it('renders the split layout: dark hero and the form', () => {
    render(<LoginScreen />);
    expect(screen.getByText('매일의 흐름')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '다시 오신 것을 환영합니다' })
    ).toBeInTheDocument();
  });

  it('shows the SignInForm by default', () => {
    render(<LoginScreen />);
    expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('toggles to the SignUpForm when "무료로 시작하기" is clicked', async () => {
    render(<LoginScreen />);
    await userEvent.click(
      screen.getByRole('button', { name: '무료로 시작하기' })
    );
    expect(
      screen.getByRole('heading', { name: '계정을 만들어 시작하세요' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /가입/ })
    ).toBeInTheDocument();
  });

  it('toggles back to the SignInForm from signup mode', async () => {
    render(<LoginScreen />);
    await userEvent.click(
      screen.getByRole('button', { name: '무료로 시작하기' })
    );
    await userEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(
      screen.getByRole('heading', { name: '다시 오신 것을 환영합니다' })
    ).toBeInTheDocument();
  });
});
