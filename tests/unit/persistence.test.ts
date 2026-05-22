import { describe, it, expect } from 'vitest';
import { loadTheme, saveTheme, THEME_KEY } from '@/lib/store/persistence';

// tests/setup.ts clears localStorage after each test.

describe('loadTheme', () => {
  it('defaults to light when nothing is stored', () => {
    expect(loadTheme()).toBe('light');
  });

  it('returns the stored theme when valid', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    expect(loadTheme()).toBe('dark');
  });

  it('defaults to light on a garbage value', () => {
    localStorage.setItem(THEME_KEY, 'rainbow');
    expect(loadTheme()).toBe('light');
  });
});

describe('saveTheme / loadTheme round-trip', () => {
  it('persists and reloads the theme', () => {
    saveTheme('dark');
    expect(loadTheme()).toBe('dark');
    saveTheme('light');
    expect(loadTheme()).toBe('light');
  });
});
