import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/context/AuthProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { TasksProvider } from '@/context/TasksProvider';
import { MainScreen } from '@/components/main/MainScreen';

// Integration coverage for the data layer + theme mechanism, exercised
// through the real provider + screen composition. Cross-session task
// persistence (was: localStorage round-trip) is now backed by Supabase
// and covered by tests/e2e/us1-signup-and-crud.spec.ts.

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => nav.params,
  useRouter: () => ({ push: nav.push }),
}));

vi.mock('@/lib/data/tasks', async () => {
  const helper = await import('../helpers/mock-data-tasks');
  return helper.mockDataTasksWithSamples();
});

beforeEach(() => {
  nav.params = new URLSearchParams();
  document.documentElement.removeAttribute('data-theme');
});

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <TasksProvider>
          <MainScreen />
        </TasksProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

describe('app integration — data layer & theme', () => {
  it('seeds tasks from the data layer on first run', async () => {
    render(<App />);
    expect(
      await screen.findByText('Q4 디자인 시스템 토큰 마이그레이션 리뷰'),
    ).toBeInTheDocument();
  });

  it('persists the theme across a remount', async () => {
    const { unmount } = render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');

    await userEvent.click(screen.getByRole('switch', { name: /테마/ }));
    expect(document.documentElement.dataset.theme).toBe('dark');

    unmount();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
