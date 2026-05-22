/**
 * T030 [US1] — Tasks data layer behaviour with mocked supabase.
 *
 * Each function should: build the right query against the right table,
 * map rows through rowToTask, and surface errors uniformly.
 *
 * The contract treats RLS as "the server is the source of truth" — we do NOT
 * pass user_id to client calls; the mocked client simulates an
 * authenticated session.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockClient, makeQueryBuilder } = vi.hoisted(() => {
  // A query builder that records its calls and lets the test specify the
  // final resolved value. Typed as `any` because the dynamic chainable shape
  // doesn't fit a clean strongly-typed interface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeQueryBuilder = (): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      single: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      __setResult(r: { data: unknown; error: unknown }) {
        builder.__result = r;
      },
      then(resolve: (v: unknown) => void) {
        resolve(builder.__result ?? { data: null, error: null });
      },
    };
    // All chain methods return the builder itself (fluent).
    ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single'].forEach((m) => {
      (builder[m] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
    });
    return builder;
  };

  const tasksBuilder = makeQueryBuilder();
  const subtasksBuilder = makeQueryBuilder();

  const mockClient = {
    from: vi.fn((table: string) => {
      if (table === 'tasks') return tasksBuilder;
      if (table === 'subtasks') return subtasksBuilder;
      throw new Error(`unexpected table ${table}`);
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'a@b.kr' } },
        error: null,
      }),
    },
    __builders: { tasks: tasksBuilder, subtasks: subtasksBuilder },
  };
  return { mockClient, makeQueryBuilder };
});

vi.mock('@/lib/supabase/client', () => ({
  getBrowserSupabase: () => mockClient,
}));

import { createTask, deleteTask, listTasks, updateTask } from '@/lib/data/tasks';

const taskRow = {
  id: 'task-1',
  user_id: 'user-1',
  title: 'A',
  due: null,
  priority: 'none',
  category: 'personal',
  starred: false,
  done: false,
  notes: '',
  sort_order: 0,
  created_at: '2026-05-20T00:00:00Z',
  updated_at: '2026-05-20T00:00:00Z',
};

beforeEach(() => {
  mockClient.from.mockClear();
  Object.values(mockClient.__builders.tasks).forEach((m) => {
    if (typeof (m as ReturnType<typeof vi.fn>).mockClear === 'function') {
      (m as ReturnType<typeof vi.fn>).mockClear();
    }
  });
  Object.values(mockClient.__builders.subtasks).forEach((m) => {
    if (typeof (m as ReturnType<typeof vi.fn>).mockClear === 'function') {
      (m as ReturnType<typeof vi.fn>).mockClear();
    }
  });
});

describe('listTasks', () => {
  it('returns mapped Tasks (with subs joined) on success', async () => {
    mockClient.__builders.tasks.__setResult({
      data: [{ ...taskRow, title: 'X', subtasks: [{ id: 's1', task_id: 'task-1', user_id: 'user-1', text: 'hi', done: false, sort_order: 0, created_at: '' }] }],
      error: null,
    });
    const result = await listTasks();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('X');
      expect(result.data[0].subs[0]).toEqual({ id: 's1', text: 'hi', done: false });
    }
  });

  it('returns ok=false on error', async () => {
    mockClient.__builders.tasks.__setResult({ data: null, error: { message: 'boom' } });
    const result = await listTasks();
    expect(result.ok).toBe(false);
  });
});

describe('createTask', () => {
  it('inserts using the data-layer (user_id auto-applied server-side via auth.uid)', async () => {
    mockClient.__builders.tasks.__setResult({
      data: { ...taskRow, title: '신규' },
      error: null,
    });
    const result = await createTask({
      title: '신규',
      due: '',
      priority: 'none',
      category: 'personal',
      starred: false,
      done: false,
      notes: '',
    });
    expect(result.ok).toBe(true);
    expect(mockClient.from).toHaveBeenCalledWith('tasks');
    expect(mockClient.__builders.tasks.insert).toHaveBeenCalled();
  });
});

describe('updateTask', () => {
  it('patches and returns the mapped row', async () => {
    mockClient.__builders.tasks.__setResult({
      data: { ...taskRow, done: true },
      error: null,
    });
    const result = await updateTask('task-1', { done: true });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.done).toBe(true);
    }
    expect(mockClient.__builders.tasks.update).toHaveBeenCalledWith({ done: true });
    expect(mockClient.__builders.tasks.eq).toHaveBeenCalledWith('id', 'task-1');
  });
});

describe('deleteTask', () => {
  it('issues a delete by id and returns ok=true on success', async () => {
    mockClient.__builders.tasks.__setResult({ data: null, error: null });
    const result = await deleteTask('task-1');
    expect(result.ok).toBe(true);
    expect(mockClient.__builders.tasks.delete).toHaveBeenCalled();
    expect(mockClient.__builders.tasks.eq).toHaveBeenCalledWith('id', 'task-1');
  });
});

// Silence unused export to satisfy TS while keeping the helper available for future tests.
void makeQueryBuilder;
