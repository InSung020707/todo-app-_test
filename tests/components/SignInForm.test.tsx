/**
 * T032 [US1] — SignInForm component behaviour.
 *
 * Mirrors SignUpForm: semantic labels, calls signInWithPassword, surfaces
 * Korean error on failure.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { signInMock } = vi.hoisted(() => ({ signInMock: vi.fn() }));

vi.mock('@/lib/data/auth', () => ({
  signInWithPassword: signInMock,
}));

import { SignInForm } from '@/components/auth/SignInForm';

beforeEach(() => {
  signInMock.mockReset();
});

describe('SignInForm', () => {
  it('renders email + password fields and a submit button', () => {
    render(<SignInForm />);
    expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /로그인/ })).toBeInTheDocument();
  });

  it('submits credentials to signInWithPassword', async () => {
    signInMock.mockResolvedValue({ ok: true, data: { id: 'u1', email: 'a@b.kr' } });
    render(<SignInForm />);
    await userEvent.type(screen.getByLabelText(/이메일/), 'a@b.kr');
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /로그인/ }));
    expect(signInMock).toHaveBeenCalledWith({
      email: 'a@b.kr',
      password: 'password1',
    });
  });

  it('shows error message on invalid credentials', async () => {
    signInMock.mockResolvedValue({
      ok: false,
      error: { message: '이메일 또는 비밀번호가 올바르지 않습니다.' },
    });
    render(<SignInForm />);
    await userEvent.type(screen.getByLabelText(/이메일/), 'a@b.kr');
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /로그인/ }));
    expect(await screen.findByText(/올바르지 않습니다/)).toBeInTheDocument();
  });
});
