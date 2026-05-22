/**
 * T034 [US1] — FR-012 regression: existing screens render correctly using the
 * refactored (Supabase-backed) TasksProvider with a mocked data layer.
 *
 * The contract is: components are unchanged; they only see a different
 * data source through the same TasksProvider public API. This test
 * confirms that MainScreen still finds and displays tasks.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => ({
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: 'u1', email: 'a@b.kr' } } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

vi.mock('@/lib/data/tasks', () => ({
  // Both tasks due today so the default 'today' view in MainScreen surfaces them.
  listTasks: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      {
        id: 't1',
        title: '회의 준비',
        due: '2026-05-15',
        priority: 'none',
        category: 'meeting',
        starred: false,
        done: false,
        notes: '',
        subs: [],
      },
      {
        id: 't2',
        title: '코드 리뷰',
        due: '2026-05-15',
        priority: 'high',
        category: 'dev',
        starred: true,
        done: false,
        notes: '',
        subs: [],
      },
    ],
  }),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
}));

import { AuthProvider } from '@/context/AuthProvider';
import { TasksProvider } from '@/context/TasksProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { MainScreen } from '@/components/main/MainScreen';

describe('Existing screens regression (FR-012)', () => {
  it('MainScreen lists Supabase-loaded tasks unchanged', async () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <TasksProvider>
            <MainScreen />
          </TasksProvider>
        </ThemeProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText(/회의 준비/)).toBeInTheDocument());
    expect(screen.getByText(/코드 리뷰/)).toBeInTheDocument();
  });
});
