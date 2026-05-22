/**
 * T031 [US1] — SignUpForm component behaviour.
 *
 * Verifies the semantic form structure (labels, button), submission to the
 * auth data layer, and visible Korean error messaging on failure.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const { signUpMock } = vi.hoisted(() => ({ signUpMock: vi.fn() }));

vi.mock('@/lib/data/auth', () => ({
  signUpWithPassword: signUpMock,
}));

import { SignUpForm } from '@/components/auth/SignUpForm';

beforeEach(() => {
  signUpMock.mockReset();
});

describe('SignUpForm', () => {
  it('renders email + password fields with accessible labels', () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText(/이메일/)).toBeInTheDocument();
    expect(screen.getByLabelText(/비밀번호/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /가입/ })).toBeInTheDocument();
  });

  it('calls signUpWithPassword on submit and shows nothing on success', async () => {
    signUpMock.mockResolvedValue({ ok: true, data: { id: 'u1', email: 'a@b.kr' } });
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText(/이메일/), 'a@b.kr');
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /가입/ }));
    expect(signUpMock).toHaveBeenCalledWith({
      email: 'a@b.kr',
      password: 'password1',
    });
  });

  it('shows Korean error message when signup fails', async () => {
    signUpMock.mockResolvedValue({
      ok: false,
      error: { message: '이미 가입된 이메일입니다. 로그인을 시도해 주세요.' },
    });
    render(<SignUpForm />);
    await userEvent.type(screen.getByLabelText(/이메일/), 'taken@b.kr');
    await userEvent.type(screen.getByLabelText(/비밀번호/), 'password1');
    await userEvent.click(screen.getByRole('button', { name: /가입/ }));
    expect(await screen.findByText(/이미 가입된 이메일/)).toBeInTheDocument();
  });
});
