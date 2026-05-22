// localStorage persistence for the theme preference. Task persistence
// moved to Supabase (see `src/lib/data/tasks.ts`) so loadTasks/saveTasks
// were removed in 002-supabase-auth.

import type { Theme } from '@/lib/types';

export const THEME_KEY = 'demodev-tasks:theme';

// SSR guard — localStorage is unavailable during server rendering.
function hasStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function loadTheme(): Theme {
  if (!hasStorage()) return 'light';
  const raw = window.localStorage.getItem(THEME_KEY);
  return raw === 'dark' || raw === 'light' ? raw : 'light';
}

export function saveTheme(theme: Theme): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(THEME_KEY, theme);
}
