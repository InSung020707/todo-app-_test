import 'server-only';

/**
 * Server-only auth helpers. Importing this file from a Client Component
 * is a build error (enforced by `server-only`). Use `./auth.ts` for
 * browser-callable auth operations.
 */

import { getServerSupabase } from '@/lib/supabase/server';

import { mapAuthError, type AuthResult, type SessionUser } from './auth';

export async function getServerUser(): Promise<SessionUser | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? null } : null;
}

export async function exchangeCodeForSession(
  code: string
): Promise<AuthResult<SessionUser>> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return { ok: false, error: mapAuthError(error) };
  }
  return {
    ok: true,
    data: { id: data.user.id, email: data.user.email ?? null },
  };
}
