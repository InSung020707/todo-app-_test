import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SideNav } from '@/components/shared/SideNav';
import { AuthProvider } from '@/context/AuthProvider';
import { TasksProvider } from '@/context/TasksProvider';
import { ThemeProvider } from '@/context/ThemeProvider';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/data/tasks', async () => {
  const helper = await import('../helpers/mock-data-tasks');
  return helper.mockDataTasksWithSamples();
});

beforeEach(() => push.mockClear());

function renderNav(props: Parameters<typeof SideNav>[0] = {}) {
  return render(
    <AuthProvider>
      <ThemeProvider>
        <TasksProvider>
          <SideNav {...props} />
        </TasksProvider>
      </ThemeProvider>
    </AuthProvider>,
  );
}

describe('SideNav', () => {
  it('renders the 5 view items, 캘린더, 통계, and 5 category items', () => {
    renderNav();
    ['받은편지함', '오늘', '예정', '지연', '완료'].forEach((name) => {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /캘린더/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /통계/ })).toBeInTheDocument();
    ['디자인', '개발', '회의', '기획', '개인'].forEach((name) => {
      expect(screen.getByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
    });
  });

  it('shows the count badge for the 오늘 view (5 from the sample data)', async () => {
    renderNav();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /오늘/ })).toHaveTextContent('5')
    );
  });

  it('marks the active view item', () => {
    renderNav({ activeView: 'today' });
    expect(screen.getByRole('button', { name: /오늘/ })).toHaveClass('is-active');
    expect(screen.getByRole('button', { name: /예정/ })).not.toHaveClass('is-active');
  });

  it('marks the active route item (calendar)', () => {
    renderNav({ activeRoute: 'calendar' });
    expect(screen.getByRole('button', { name: /캘린더/ })).toHaveClass('is-active');
  });

  it('marks the active category item', () => {
    renderNav({ activeCat: 'design' });
    expect(screen.getByRole('button', { name: /디자인/ })).toHaveClass('is-active');
  });

  it('navigates to /main with the view query when a view item is clicked', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: /예정/ }));
    expect(push).toHaveBeenCalledWith('/main?view=upcoming');
  });

  it('navigates to /main with the cat query when a category is clicked', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: /디자인/ }));
    expect(push).toHaveBeenCalledWith('/main?cat=design');
  });

  it('navigates to /calendar and /stats from those items', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: /캘린더/ }));
    expect(push).toHaveBeenCalledWith('/calendar');
    await userEvent.click(screen.getByRole('button', { name: /통계/ }));
    expect(push).toHaveBeenCalledWith('/stats');
  });

  it('renders the theme toggle in the footer', () => {
    renderNav();
    expect(
      screen.getByRole('switch', { name: /테마/ }),
    ).toBeInTheDocument();
  });
});
