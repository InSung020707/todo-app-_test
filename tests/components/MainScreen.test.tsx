import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MainScreen } from '@/components/main/MainScreen';
import { AuthProvider } from '@/context/AuthProvider';
import { TasksProvider } from '@/context/TasksProvider';
import { ThemeProvider } from '@/context/ThemeProvider';

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
  nav.push.mockClear();
});

function renderMain() {
  return render(
    <AuthProvider>
      <ThemeProvider>
        <TasksProvider>
          <MainScreen />
        </TasksProvider>
      </ThemeProvider>
    </AuthProvider>,
  );
}

describe('MainScreen', () => {
  it('renders the three panels: nav, list, detail placeholder', () => {
    renderMain();
    expect(screen.getByText('Tasks')).toBeInTheDocument(); // SideNav brand
    expect(
      screen.getByPlaceholderText(/할 일을 추가하세요/),
    ).toBeInTheDocument(); // TaskList add input
    expect(
      screen.getByText('선택된 할 일이 없습니다'),
    ).toBeInTheDocument(); // empty DetailPanel placeholder
  });

  it('defaults to the today view when no query is present', () => {
    renderMain();
    expect(screen.getByRole('heading', { name: /오늘/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /오늘/ })).toHaveClass(
      'is-active',
    );
  });

  it('reflects the view query', () => {
    nav.params = new URLSearchParams('view=upcoming');
    renderMain();
    expect(screen.getByRole('heading', { name: /예정/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /예정/ })).toHaveClass(
      'is-active',
    );
  });

  it('reflects the category query', () => {
    nav.params = new URLSearchParams('cat=design');
    renderMain();
    expect(screen.getByRole('heading', { name: /디자인/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /디자인/ })).toHaveClass(
      'is-active',
    );
  });

  it('ignores an unknown view query and falls back to today', () => {
    nav.params = new URLSearchParams('view=bogus');
    renderMain();
    expect(screen.getByRole('heading', { name: /오늘/ })).toBeInTheDocument();
  });

  it('selects a task into the detail panel when its row is clicked', async () => {
    renderMain(); // today view — t1 is visible
    const row = await waitFor(() =>
      screen.getByText('Q4 디자인 시스템 토큰 마이그레이션 리뷰')
    );
    await userEvent.click(row);
    expect(
      screen.getByDisplayValue('Q4 디자인 시스템 토큰 마이그레이션 리뷰'),
    ).toBeInTheDocument();
  });

  it('returns to the empty detail state after deleting the selected task', async () => {
    renderMain();
    const row = await waitFor(() =>
      screen.getByText('Q4 디자인 시스템 토큰 마이그레이션 리뷰')
    );
    await userEvent.click(row);
    await userEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(screen.getByText('선택된 할 일이 없습니다')).toBeInTheDocument();
  });
});
