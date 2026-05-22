import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Env stubs so getBrowserSupabase doesn't throw at construction.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Default global stub for the Supabase browser client. Unit tests that
// need specific behaviour (tests/unit/data-*.test.ts) override this with
// their own vi.mock in the test file.
vi.mock('@/lib/supabase/client', () => {
  const makeChain = () => {
    const chain: {
      [k: string]: unknown;
      then: (resolve: (v: unknown) => void) => void;
    } = {
      then(resolve) {
        resolve({ data: null, error: null });
      },
    };
    ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single'].forEach(
      (m) => {
        chain[m] = vi.fn(() => chain);
      }
    );
    return chain;
  };
  return {
    getBrowserSupabase: () => ({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: null }, error: null })
        ),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signUp: vi.fn(() =>
          Promise.resolve({ data: { user: null }, error: null })
        ),
        signInWithPassword: vi.fn(() =>
          Promise.resolve({ data: { user: null }, error: null })
        ),
        signOut: vi.fn(() => Promise.resolve({ error: null })),
        signInWithOAuth: vi.fn(() =>
          Promise.resolve({ data: null, error: null })
        ),
      },
      from: vi.fn(() => makeChain()),
    }),
  };
});

// Reset DOM + localStorage between tests so persistence/theme cases start clean.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
