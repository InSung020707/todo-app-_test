/**
 * Tasks data layer — the single entrypoint for task/subtask CRUD.
 *
 * Components consume this via TasksProvider only. Direct supabase-js calls
 * outside this file are forbidden by the constitution.
 *
 * See specs/002-supabase-auth/contracts/tasks.md for the full contract.
 */

import { getBrowserSupabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import type {
  CategoryId,
  PriorityId,
  Subtask,
  Task,
} from '@/lib/types';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type SubtaskRow = Database['public']['Tables']['subtasks']['Row'];
type SubtaskInsert = Database['public']['Tables']['subtasks']['Insert'];

export type DataError = {
  message: string;
  code?: string;
};

export type DataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DataError };

// ---------- Row ↔ Domain mappers ----------

export function rowToTask(row: TaskRow, subs: SubtaskRow[] = []): Task {
  return {
    id: row.id,
    title: row.title,
    due: row.due ?? '',
    priority: row.priority as PriorityId,
    category: row.category as CategoryId,
    starred: row.starred,
    done: row.done,
    notes: row.notes,
    subs: subs.map(subRowToSubtask),
  };
}

export function subRowToSubtask(row: SubtaskRow): Subtask {
  return { id: row.id, text: row.text, done: row.done };
}

export function taskToInsert(
  task: Omit<Task, 'id' | 'subs'>,
  userId: string
): TaskInsert {
  return {
    user_id: userId,
    title: task.title,
    due: task.due === '' ? null : task.due,
    priority: task.priority,
    category: task.category,
    starred: task.starred,
    done: task.done,
    notes: task.notes,
  };
}

export function taskPatchToUpdate(
  patch: Partial<Omit<Task, 'id' | 'subs'>>
): Partial<TaskInsert> {
  const out: Partial<TaskInsert> = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.due !== undefined) out.due = patch.due === '' ? null : patch.due;
  if (patch.priority !== undefined) out.priority = patch.priority;
  if (patch.category !== undefined) out.category = patch.category;
  if (patch.starred !== undefined) out.starred = patch.starred;
  if (patch.done !== undefined) out.done = patch.done;
  if (patch.notes !== undefined) out.notes = patch.notes;
  return out;
}

// ---------- Error helpers ----------

function mapError(err: { message?: string; code?: string } | null | undefined): DataError {
  const msg = err?.message ?? '';
  if (/permission|RLS|row-level security/i.test(msg)) {
    return { message: '권한이 없습니다.', code: err?.code };
  }
  if (/network|fetch|timeout/i.test(msg)) {
    return {
      message: '네트워크 오류가 발생했습니다. 다시 시도해 주세요.',
      code: err?.code,
    };
  }
  if (/violates check constraint|not-null|empty/i.test(msg)) {
    return { message: '필수 항목이 비어있습니다.', code: err?.code };
  }
  return { message: '잠시 후 다시 시도해 주세요.', code: err?.code };
}

async function currentUserId(): Promise<string | null> {
  const supabase = getBrowserSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---------- Public API ----------

export async function listTasks(): Promise<DataResult<Task[]>> {
  const supabase = getBrowserSupabase();
  // Embed subtasks via Postgrest's resource embedding. RLS guarantees the
  // join only returns rows owned by the current user.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await supabase
    .from('tasks')
    .select('*, subtasks(*)')
    .order('created_at', { ascending: false })) as any;
  if (error) return { ok: false, error: mapError(error) };
  const rows = (data ?? []) as Array<TaskRow & { subtasks: SubtaskRow[] }>;
  return {
    ok: true,
    data: rows.map((r) => rowToTask(r, r.subtasks ?? [])),
  };
}

export async function createTask(
  input: Omit<Task, 'id' | 'subs'>
): Promise<DataResult<Task>> {
  const userId = await currentUserId();
  if (!userId) {
    return { ok: false, error: { message: '로그인이 필요합니다.' } };
  }
  const supabase = getBrowserSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await supabase
    .from('tasks')
    .insert(taskToInsert(input, userId))
    .select()
    .single()) as any;
  if (error || !data) return { ok: false, error: mapError(error) };
  return { ok: true, data: rowToTask(data as TaskRow, []) };
}

export async function updateTask(
  id: string,
  patch: Partial<Omit<Task, 'id' | 'subs'>>
): Promise<DataResult<Task>> {
  const supabase = getBrowserSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await supabase
    .from('tasks')
    .update(taskPatchToUpdate(patch))
    .eq('id', id)
    .select()
    .single()) as any;
  if (error || !data) return { ok: false, error: mapError(error) };
  return { ok: true, data: rowToTask(data as TaskRow, []) };
}

export async function deleteTask(id: string): Promise<DataResult<void>> {
  const supabase = getBrowserSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = (await supabase.from('tasks').delete().eq('id', id)) as any;
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true, data: undefined };
}

// ---------- Subtasks ----------

export async function createSubtask(
  taskId: string,
  input: Omit<Subtask, 'id'>
): Promise<DataResult<Subtask>> {
  const userId = await currentUserId();
  if (!userId) {
    return { ok: false, error: { message: '로그인이 필요합니다.' } };
  }
  const supabase = getBrowserSupabase();
  // user_id is filled by the BEFORE INSERT trigger; we still pass it
  // because the column is NOT NULL — the trigger overrides anyway.
  const insert: SubtaskInsert = {
    task_id: taskId,
    user_id: userId,
    text: input.text,
    done: input.done,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await supabase
    .from('subtasks')
    .insert(insert)
    .select()
    .single()) as any;
  if (error || !data) return { ok: false, error: mapError(error) };
  return { ok: true, data: subRowToSubtask(data as SubtaskRow) };
}

export async function updateSubtask(
  id: string,
  patch: Partial<Omit<Subtask, 'id'>>
): Promise<DataResult<Subtask>> {
  const supabase = getBrowserSupabase();
  const update: Partial<SubtaskInsert> = {};
  if (patch.text !== undefined) update.text = patch.text;
  if (patch.done !== undefined) update.done = patch.done;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await supabase
    .from('subtasks')
    .update(update)
    .eq('id', id)
    .select()
    .single()) as any;
  if (error || !data) return { ok: false, error: mapError(error) };
  return { ok: true, data: subRowToSubtask(data as SubtaskRow) };
}

export async function deleteSubtask(id: string): Promise<DataResult<void>> {
  const supabase = getBrowserSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = (await supabase.from('subtasks').delete().eq('id', id)) as any;
  if (error) return { ok: false, error: mapError(error) };
  return { ok: true, data: undefined };
}
