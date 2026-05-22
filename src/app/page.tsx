/**
 * Root entrypoint. Sends the user to /main if they have a session, or to
 * /login otherwise. Decided server-side so there's no UI flash.
 */
import { redirect } from 'next/navigation';

import { getServerSupabase } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/main');
  }
  redirect('/login');
}
