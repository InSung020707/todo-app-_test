/**
 * Browser-side Supabase client factory.
 *
 * Use only in Client Components (`'use client'`) and code that runs in the browser.
 * For Server Components / Route Handlers / Server Actions, use `./server`.
 */
import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './database.types';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getBrowserSupabase() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — check .env.local'
    );
  }
  cached = createBrowserClient<Database>(url, key);
  return cached;
}
