/**
 * T029 [US1] — Auth data layer (browser-side) behaviour with mocked supabase.
 *
 * Verifies that signUpWithPassword / signInWithPassword / signOut delegate
 * to supabase correctly and translate Supabase errors to Korean user-facing
 * messages per contracts/auth.md.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mock client so we can both inject it via vi.mock and read it
// inside test cases.
const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => ({ auth: mockAuth }),
}));

import {
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from '@/lib/data/auth';

describe('signUpWithPassword', () => {
  beforeEach(() => {
    Object.values(mockAuth).forEach((m) => (m as ReturnType<typeof vi.fn>).mockReset());
  });

  it('returns ok=true and SessionUser on success', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.kr' } },
      error: null,
    });
    const result = await signUpWithPassword({ email: 'a@b.kr', password: 'pwpwpw' });
    expect(result).toEqual({ ok: true, data: { id: 'u1', email: 'a@b.kr' } });
    expect(mockAuth.signUp).toHaveBeenCalledWith({
      email: 'a@b.kr',
      password: 'pwpwpw',
    });
  });

  it('maps "User already registered" to Korean error', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    });
    const result = await signUpWithPassword({ email: 'a@b.kr', password: 'pwpwpw' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/이미 가입/);
    }
  });

  it('maps short-password error to Korean error', async () => {
    mockAuth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password should be at least 6 characters', code: 'weak_password' },
    });
    const result = await signUpWithPassword({ email: 'a@b.kr', password: 'abc' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/6자/);
    }
  });
});

describe('signInWithPassword', () => {
  beforeEach(() => {
    Object.values(mockAuth).forEach((m) => (m as ReturnType<typeof vi.fn>).mockReset());
  });

  it('returns ok=true on success', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1', email: 'a@b.kr' } },
      error: null,
    });
    const result = await signInWithPassword({ email: 'a@b.kr', password: 'pw' });
    expect(result).toEqual({ ok: true, data: { id: 'u1', email: 'a@b.kr' } });
  });

  it('maps Invalid login credentials to Korean error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials', code: 'invalid_credentials' },
    });
    const result = await signInWithPassword({ email: 'a@b.kr', password: 'wrong' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/이메일.*비밀번호/);
    }
  });
});

describe('signOut', () => {
  beforeEach(() => {
    Object.values(mockAuth).forEach((m) => (m as ReturnType<typeof vi.fn>).mockReset());
  });

  it('calls supabase.auth.signOut and returns ok=true on success', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    const result = await signOut();
    expect(result).toEqual({ ok: true, data: undefined });
    expect(mockAuth.signOut).toHaveBeenCalled();
  });
});
