/**
 * OAuth callback handler. Exchanges the ?code= for a session and redirects
 * to /main on success, /login?error=oauth_failed on failure.
 *
 * US3 (T061) replaces the 501 body with the real exchange. Stays as a
 * skeleton in Phase 2 so the route exists for tests that need it to resolve.
 */
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'not_implemented', message: 'OAuth callback is not wired yet.' },
    { status: 501 }
  );
}
