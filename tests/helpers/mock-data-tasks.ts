/**
 * Helper for component tests that previously relied on SAMPLE_TASKS being
 * automatically seeded into TasksProvider via localStorage. After the
 * Supabase refactor, tasks come from the data layer — this helper builds
 * the mock factory those tests need.
 *
 * Usage in a test file:
 *
 *   vi.mock('@/lib/data/tasks', async () => {
 *     const helper = await import('../helpers/mock-data-tasks');
 *     return helper.mockDataTasksWithSamples();
 *   });
 */
import { vi } from 'vitest';

import { SAMPLE_TASKS } from '@/lib/store/sample-data';
import type { Subtask, Task } from '@/lib/types';

const emptyTask = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: 'mock',
  due: '',
  priority: 'none',
  category: 'personal',
  starred: false,
  done: false,
  notes: '',
  subs: [],
  ...over,
});

const emptySub = (id: string, over: Partial<Subtask> = {}): Subtask => ({
  id,
  text: 'mock',
  done: false,
  ...over,
});

export function mockDataTasksWithSamples() {
  // Look up the original task by id so updates merge over the full shape
  // and don't drop fields the components expect (priority, category, etc.).
  const findOriginal = (id: string): Task | undefined =>
    SAMPLE_TASKS.find((t) => t.id === id);

  return {
    listTasks: vi.fn().mockResolvedValue({ ok: true, data: SAMPLE_TASKS }),
    createTask: vi
      .fn()
      .mockImplementation(async (input: Omit<Task, 'id' | 'subs'>) => ({
        ok: true,
        data: {
          id: `mock-task-${Math.random().toString(36).slice(2, 8)}`,
          subs: [],
          ...input,
        } as Task,
      })),
    updateTask: vi
      .fn()
      .mockImplementation(
        async (id: string, patch: Partial<Omit<Task, 'id' | 'subs'>>) => {
          const base = findOriginal(id) ?? emptyTask(id);
          return {
            ok: true,
            data: { ...base, ...patch, id } as Task,
          };
        }
      ),
    deleteTask: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    createSubtask: vi
      .fn()
      .mockImplementation(
        async (_taskId: string, input: Omit<Subtask, 'id'>) => ({
          ok: true,
          data: {
            id: `mock-sub-${Math.random().toString(36).slice(2, 8)}`,
            ...input,
          } as Subtask,
        })
      ),
    updateSubtask: vi
      .fn()
      .mockImplementation(
        async (id: string, patch: Partial<Omit<Subtask, 'id'>>) => ({
          ok: true,
          data: { ...emptySub(id), ...patch } as Subtask,
        })
      ),
    deleteSubtask: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  };
}
