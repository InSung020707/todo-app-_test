/**
 * Updated for 002-supabase-auth: TasksProvider now sources tasks from the
 * Supabase data layer instead of localStorage. The PUBLIC API is unchanged
 * (FR-012) — these tests verify the same behaviors via mocked data layer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Subtask, Task } from '@/lib/types';

// Hoisted mocks — exposed at module top so we can both inject via vi.mock
// and adjust per-test.
const { dataMock } = vi.hoisted(() => ({
  dataMock: {
    listTasks: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    createSubtask: vi.fn(),
    updateSubtask: vi.fn(),
    deleteSubtask: vi.fn(),
  },
}));

vi.mock('@/lib/data/tasks', () => dataMock);

import { TasksProvider, useTasks } from '@/context/TasksProvider';

const baseTask = (over: Partial<Task> = {}): Task => ({
  id: 't1',
  title: '첫 작업',
  due: '',
  priority: 'none',
  category: 'dev',
  starred: false,
  done: false,
  notes: '',
  subs: [],
  ...over,
});

const baseSub = (over: Partial<Subtask> = {}): Subtask => ({
  id: 's1',
  text: '하위 1',
  done: true,
  ...over,
});

function Probe() {
  const {
    tasks,
    addTask,
    toggleDone,
    deleteTask,
    updateTask,
    addSub,
    toggleSub,
    deleteSub,
  } = useTasks();
  const first = tasks[0];
  return (
    <div>
      <span data-testid="count">{tasks.length}</span>
      <span data-testid="first-title">{first?.title}</span>
      <span data-testid="first-done">{String(first?.done)}</span>
      <span data-testid="first-subs">{first?.subs.length ?? 0}</span>
      <span data-testid="first-sub0-done">{String(first?.subs[0]?.done)}</span>
      <button onClick={() => addTask('새 작업', null, 'today')}>add</button>
      <button onClick={() => first && toggleDone(first.id)}>toggleDone</button>
      <button onClick={() => first && deleteTask(first.id)}>delete</button>
      <button onClick={() => first && updateTask(first.id, { title: '수정됨' })}>
        update
      </button>
      <button onClick={() => first && addSub(first.id, '새 서브')}>addSub</button>
      <button onClick={() => first && toggleSub(first.id, first.subs[0]?.id)}>
        toggleSub
      </button>
      <button onClick={() => first && deleteSub(first.id, first.subs[0]?.id)}>
        deleteSub
      </button>
    </div>
  );
}

function setup() {
  return render(
    <TasksProvider>
      <Probe />
    </TasksProvider>
  );
}

beforeEach(() => {
  Object.values(dataMock).forEach((m) => (m as ReturnType<typeof vi.fn>).mockReset());
  // Default: empty list.
  dataMock.listTasks.mockResolvedValue({ ok: true, data: [] });
});

describe('TasksProvider (Supabase-backed)', () => {
  it('hydrates from listTasks() on mount', async () => {
    dataMock.listTasks.mockResolvedValue({
      ok: true,
      data: [baseTask({ id: 't1', title: '서버에서 로드됨' })],
    });
    setup();
    await waitFor(() =>
      expect(screen.getByTestId('first-title')).toHaveTextContent('서버에서 로드됨')
    );
  });

  it('addTask calls createTask and prepends the returned row', async () => {
    dataMock.createTask.mockResolvedValue({
      ok: true,
      data: baseTask({ id: 'new', title: '새 작업' }),
    });
    setup();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    await userEvent.click(screen.getByText('add'));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(screen.getByTestId('first-title')).toHaveTextContent('새 작업');
  });

  it('toggleDone flips done locally and calls updateTask', async () => {
    dataMock.listTasks.mockResolvedValue({
      ok: true,
      data: [baseTask({ id: 't1', done: false })],
    });
    dataMock.updateTask.mockResolvedValue({
      ok: true,
      data: baseTask({ id: 't1', done: true }),
    });
    setup();
    await waitFor(() => expect(screen.getByTestId('first-done')).toHaveTextContent('false'));
    await userEvent.click(screen.getByText('toggleDone'));
    await waitFor(() => expect(screen.getByTestId('first-done')).toHaveTextContent('true'));
    expect(dataMock.updateTask).toHaveBeenCalledWith('t1', { done: true });
  });

  it('deleteTask removes locally and calls deleteTask', async () => {
    dataMock.listTasks.mockResolvedValue({
      ok: true,
      data: [baseTask({ id: 't1' })],
    });
    dataMock.deleteTask.mockResolvedValue({ ok: true, data: undefined });
    setup();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    await userEvent.click(screen.getByText('delete'));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(dataMock.deleteTask).toHaveBeenCalledWith('t1');
  });

  it('updateTask patches title and calls updateTask', async () => {
    dataMock.listTasks.mockResolvedValue({
      ok: true,
      data: [baseTask({ id: 't1', title: '원본' })],
    });
    dataMock.updateTask.mockResolvedValue({
      ok: true,
      data: baseTask({ id: 't1', title: '수정됨' }),
    });
    setup();
    await waitFor(() => expect(screen.getByTestId('first-title')).toHaveTextContent('원본'));
    await userEvent.click(screen.getByText('update'));
    await waitFor(() => expect(screen.getByTestId('first-title')).toHaveTextContent('수정됨'));
    expect(dataMock.updateTask).toHaveBeenCalledWith('t1', { title: '수정됨' });
  });

  it('addSub / toggleSub / deleteSub manipulate subtasks via data layer', async () => {
    dataMock.listTasks.mockResolvedValue({
      ok: true,
      data: [baseTask({ id: 't1', subs: [baseSub({ id: 's1', done: true })] })],
    });
    dataMock.createSubtask.mockResolvedValue({
      ok: true,
      data: baseSub({ id: 's2', text: '새 서브', done: false }),
    });
    dataMock.updateSubtask.mockResolvedValue({
      ok: true,
      data: baseSub({ id: 's1', done: false }),
    });
    dataMock.deleteSubtask.mockResolvedValue({ ok: true, data: undefined });

    setup();
    await waitFor(() => expect(screen.getByTestId('first-subs')).toHaveTextContent('1'));

    await userEvent.click(screen.getByText('addSub'));
    await waitFor(() => expect(screen.getByTestId('first-subs')).toHaveTextContent('2'));
    expect(dataMock.createSubtask).toHaveBeenCalledWith('t1', { text: '새 서브', done: false });

    expect(screen.getByTestId('first-sub0-done')).toHaveTextContent('true');
    await userEvent.click(screen.getByText('toggleSub'));
    await waitFor(() => expect(screen.getByTestId('first-sub0-done')).toHaveTextContent('false'));
    expect(dataMock.updateSubtask).toHaveBeenCalledWith('s1', { done: false });

    await userEvent.click(screen.getByText('deleteSub'));
    await waitFor(() => expect(screen.getByTestId('first-subs')).toHaveTextContent('1'));
    expect(dataMock.deleteSubtask).toHaveBeenCalledWith('s1');
  });
});
