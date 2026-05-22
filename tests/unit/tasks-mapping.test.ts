/**
 * T028 [US1] — Row ↔ Domain mapping for the tasks data layer.
 *
 * Exercises rowToTask / subRowToSubtask / taskToInsert with edge cases
 * (null due ↔ '' due, sub merging, snake_case ↔ camelCase).
 */
import { describe, it, expect } from 'vitest';

import {
  rowToTask,
  subRowToSubtask,
  taskToInsert,
} from '@/lib/data/tasks';
import type { Database } from '@/lib/supabase/database.types';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type SubtaskRow = Database['public']['Tables']['subtasks']['Row'];

const makeTaskRow = (overrides: Partial<TaskRow> = {}): TaskRow => ({
  id: 'task-1',
  user_id: 'user-1',
  title: '문서 정리',
  due: '2026-05-20',
  priority: 'med',
  category: 'dev',
  starred: false,
  done: false,
  notes: '메모',
  sort_order: 0,
  created_at: '2026-05-20T00:00:00Z',
  updated_at: '2026-05-20T00:00:00Z',
  ...overrides,
});

const makeSubRow = (overrides: Partial<SubtaskRow> = {}): SubtaskRow => ({
  id: 'sub-1',
  task_id: 'task-1',
  user_id: 'user-1',
  text: '항목 1',
  done: false,
  sort_order: 0,
  created_at: '2026-05-20T00:00:00Z',
  ...overrides,
});

describe('rowToTask', () => {
  it('maps a full task row to the domain shape', () => {
    const row = makeTaskRow();
    const task = rowToTask(row, []);
    expect(task).toEqual({
      id: 'task-1',
      title: '문서 정리',
      due: '2026-05-20',
      priority: 'med',
      category: 'dev',
      starred: false,
      done: false,
      notes: '메모',
      subs: [],
    });
  });

  it('converts null due to empty string', () => {
    const task = rowToTask(makeTaskRow({ due: null }), []);
    expect(task.due).toBe('');
  });

  it('attaches subtasks via subRowToSubtask', () => {
    const task = rowToTask(makeTaskRow(), [
      makeSubRow({ id: 's1', text: 'a', done: true }),
      makeSubRow({ id: 's2', text: 'b', done: false }),
    ]);
    expect(task.subs).toEqual([
      { id: 's1', text: 'a', done: true },
      { id: 's2', text: 'b', done: false },
    ]);
  });
});

describe('taskToInsert', () => {
  it('maps domain → DB insert with user_id and null due for empty string', () => {
    const insert = taskToInsert(
      {
        title: '새 작업',
        due: '',
        priority: 'none',
        category: 'personal',
        starred: false,
        done: false,
        notes: '',
      },
      'user-42'
    );
    expect(insert).toEqual({
      user_id: 'user-42',
      title: '새 작업',
      due: null,
      priority: 'none',
      category: 'personal',
      starred: false,
      done: false,
      notes: '',
    });
  });

  it('preserves due string when not empty', () => {
    const insert = taskToInsert(
      {
        title: 'x',
        due: '2026-06-01',
        priority: 'high',
        category: 'dev',
        starred: true,
        done: false,
        notes: '',
      },
      'user-1'
    );
    expect(insert.due).toBe('2026-06-01');
  });
});

describe('subRowToSubtask', () => {
  it('maps subtask row to domain', () => {
    expect(subRowToSubtask(makeSubRow({ id: 'x', text: 'y', done: true }))).toEqual({
      id: 'x',
      text: 'y',
      done: true,
    });
  });
});
