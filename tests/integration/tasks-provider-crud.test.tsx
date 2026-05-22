/**
 * T033 [US1] — TasksProvider (post-refactor) integrates with the data layer.
 *
 * Mocks the data layer to return predictable shapes, verifies that the
 * Provider's public API (addTask / toggleDone / etc.) translates to data
 * layer calls. Existing components consume this same public API, so a
 * passing test here means they keep working.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { listTasks, createTask, updateTask, deleteTask } = vi.hoisted(() => ({
  listTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock('@/lib/data/tasks', () => ({
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'u1', email: 'a@b.kr' } } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  }),
}));

import { AuthProvider } from '@/context/AuthProvider';
import { TasksProvider, useTasks } from '@/context/TasksProvider';
import type { Task } from '@/lib/types';

function Probe() {
  const t = useTasks();
  return (
    <div>
      <span data-testid="count">{t.tasks.length}</span>
      <span data-testid="first">{t.tasks[0]?.title ?? '(none)'}</span>
      <button onClick={() => t.addTask('새 작업', null, 'today')}>add</button>
      <button onClick={() => t.toggleDone(t.tasks[0]!.id)}>toggle</button>
      <button onClick={() => t.deleteTask(t.tasks[0]!.id)}>del</button>
    </div>
  );
}

const baseTask = (over: Partial<Task> = {}): Task => ({
  id: 't1',
  title: '기본',
  due: '',
  priority: 'none',
  category: 'personal',
  starred: false,
  done: false,
  notes: '',
  subs: [],
  ...over,
});

beforeEach(() => {
  listTasks.mockReset();
  createTask.mockReset();
  updateTask.mockReset();
  deleteTask.mockReset();
});

describe('TasksProvider × data layer', () => {
  it('hydrates from listTasks() on mount', async () => {
    listTasks.mockResolvedValue({
      ok: true,
      data: [baseTask({ id: 't1', title: '문서' }), baseTask({ id: 't2', title: '회의' })],
    });

    render(
      <AuthProvider>
        <TasksProvider>
          <Probe />
        </TasksProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'));
    expect(screen.getByTestId('first')).toHaveTextContent('문서');
  });

  it('addTask calls createTask and reflects the returned row', async () => {
    listTasks.mockResolvedValue({ ok: true, data: [] });
    createTask.mockResolvedValue({
      ok: true,
      data: baseTask({ id: 't-new', title: '새 작업' }),
    });

    render(
      <AuthProvider>
        <TasksProvider>
          <Probe />
        </TasksProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'));
    await userEvent.click(screen.getByText('add'));
    await waitFor(() => expect(createTask).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
  });

  it('toggleDone calls updateTask({done: !current})', async () => {
    listTasks.mockResolvedValue({
      ok: true,
      data: [baseTask({ id: 't1', done: false })],
    });
    updateTask.mockResolvedValue({
      ok: true,
      data: baseTask({ id: 't1', done: true }),
    });

    render(
      <AuthProvider>
        <TasksProvider>
          <Probe />
        </TasksProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    await userEvent.click(screen.getByText('toggle'));
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith('t1', { done: true }));
  });

  it('deleteTask calls deleteTask and removes the row', async () => {
    listTasks.mockResolvedValue({
      ok: true,
      data: [baseTask({ id: 't1' })],
    });
    deleteTask.mockResolvedValue({ ok: true, data: undefined });

    render(
      <AuthProvider>
        <TasksProvider>
          <Probe />
        </TasksProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'));
    await userEvent.click(screen.getByText('del'));
    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith('t1'));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'));
  });
});

// Silence unused import warning when running this file in isolation.
void act;
