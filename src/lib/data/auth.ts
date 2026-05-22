/**
 * Auth data layer (browser-side). The single entrypoint for authentication
 * operations called from Client Components. Server-only auth helpers
 * (getServerUser, exchangeCodeForSession) live in `./auth-server.ts` so
 * the client bundle does not transitively import `next/headers`.
 *
 * See specs/002-supabase-auth/contracts/auth.md for the full contract.
 */

import { getBrowserSupabase } from '@/lib/supabase/client';

export type SessionUser = {
  id: string;
  email: string | null;
};

export type AuthError = {
  /** Korean, user-facing message. */
  message: string;
  /** Optional original code for branching/logging — not for UI. */
  code?: string;
};

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AuthError };

/**
 * Maps Supabase error messages/codes to Korean user-facing copy. Unknown
 * errors fall through to a generic retry message.
 */
export function mapAuthError(
  err: { message?: string; code?: string } | null | undefined
): AuthError {
  const msg = err?.message ?? '';
  const code = err?.code;

  if (/Invalid login credentials/i.test(msg) || code === 'invalid_credentials') {
    return {
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      code: code ?? 'invalid_credentials',
    };
  }
  if (/already registered|user_already_exists/i.test(msg) || code === 'user_already_exists') {
    return {
      message: '이미 가입된 이메일입니다. 로그인을 시도해 주세요.',
      code: code ?? 'user_already_exists',
    };
  }
  if (/at least 6 characters|weak_password|short/i.test(msg) || code === 'weak_password') {
    return {
      message: '비밀번호는 6자 이상이어야 합니다.',
      code: code ?? 'weak_password',
    };
  }
  if (/fetch|network|timeout/i.test(msg)) {
    return { message: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.', code };
  }
  return { message: '잠시 후 다시 시도해 주세요.', code };
}

export async function signUpWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthResult<SessionUser>> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (error || !data.user) {
    return { ok: false, error: mapAuthError(error) };
  }
  return {
    ok: true,
    data: { id: data.user.id, email: data.user.email ?? null },
  };
}

export async function signInWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthResult<SessionUser>> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error || !data.user) {
    return { ok: false, error: mapAuthError(error) };
  }
  return {
    ok: true,
    data: { id: data.user.id, email: data.user.email ?? null },
  };
}

export async function signInWithGoogle(
  redirectTo: string
): Promise<AuthResult<void>> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) {
    return { ok: false, error: mapAuthError(error) };
  }
  return { ok: true, data: undefined };
}

export async function signOut(): Promise<AuthResult<void>> {
  const supabase = getBrowserSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, error: mapAuthError(error) };
  }
  return { ok: true, data: undefined };
}
