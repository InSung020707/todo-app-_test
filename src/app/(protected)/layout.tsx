/**
 * Layout for all authenticated routes. Performs a server-side session check
 * and redirects unauthenticated visitors to /login before rendering any UI.
 *
 * This is the single guard for /main, /calendar, /stats and any future
 * protected route placed under app/(protected)/.
 */
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getServerSupabase } from '@/lib/supabase/server';

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
