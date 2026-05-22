/**
 * Login screen. If the visitor already has a session, send them to /main
 * (reverse guard — handled in US2/T054 but already wired here for cleanliness).
 *
 * Renders the existing LoginScreen component, which the US1 implementation
 * wires to real Supabase auth via the SignIn/SignUp forms it composes.
 */
import { redirect } from 'next/navigation';

import { LoginScreen } from '@/components/login/LoginScreen';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function LoginPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/main');
  }

  return (
    <div className="app">
      <LoginScreen />
    </div>
  );
}
