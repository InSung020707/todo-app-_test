'use client';

// Shared task state, backed by the Supabase data layer (`@/lib/data/tasks`).
//
// Public API is unchanged from the localStorage-era TasksProvider so the
// consuming components (MainScreen / CalendarScreen / TaskRow / DetailPanel)
// require no edits — this satisfies FR-012 (zero regression).
//
// Strategy: on mount, hydrate via listTasks(). Every mutation calls the
// data layer; local state updates only after the server confirms (the data
// layer returns the canonical row). Deletes are optimistic so the UI feels
// snappy.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CategoryId, Task, ViewId } from '@/lib/types';
import { TODAY_KEY } from '@/lib/store/dates';
import * as data from '@/lib/data/tasks';

interface TasksContextValue {
  tasks: Task[];
  addTask: (title: string, categoryHint: CategoryId | null, view: ViewId) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleDone: (id: string) => void;
  toggleStar: (id: string) => void;
  addSub: (taskId: string, text: string) => void;
  toggleSub: (taskId: string, subId: string) => void;
  deleteSub: (taskId: string, subId: string) => void;
}

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Hydrate from Supabase on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await data.listTasks();
      if (cancelled) return;
      if (result.ok) {
        setTasks(result.data);
      } else {
        // Stay empty; the user will see an empty list. Errors surface in
        // dev tools; v1 keeps UI silent to avoid noise on fresh accounts.
        setTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addTask = useCallback(
    (title: string, categoryHint: CategoryId | null, view: ViewId) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const category = categoryHint ?? 'dev';
      // Default due date keeps parity with the legacy reducer's behavior:
      // 'upcoming' lands a few days out, others land on TODAY_KEY.
      const due = view === 'upcoming' ? '2026-05-18' : TODAY_KEY;
      void data
        .createTask({
          title: trimmed,
          due,
          priority: 'none',
          category,
          starred: false,
          done: false,
          notes: '',
        })
        .then((result) => {
          if (result.ok) {
            setTasks((prev) => [result.data, ...prev]);
          }
        });
    },
    []
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      const dataPatch: Partial<Omit<Task, 'id' | 'subs'>> = {};
      if (patch.title !== undefined) dataPatch.title = patch.title;
      if (patch.due !== undefined) dataPatch.due = patch.due;
      if (patch.priority !== undefined) dataPatch.priority = patch.priority;
      if (patch.category !== undefined) dataPatch.category = patch.category;
      if (patch.starred !== undefined) dataPatch.starred = patch.starred;
      if (patch.done !== undefined) dataPatch.done = patch.done;
      if (patch.notes !== undefined) dataPatch.notes = patch.notes;

      void data.updateTask(id, dataPatch).then((result) => {
        if (result.ok) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === id ? { ...result.data, subs: t.subs } : t
            )
          );
        }
      });
    },
    []
  );

  const deleteTask = useCallback((id: string) => {
    // Optimistic delete — remove locally immediately, then call the server.
    setTasks((prev) => prev.filter((t) => t.id !== id));
    void data.deleteTask(id);
  }, []);

  const toggleDone = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const cur = prev.find((t) => t.id === id);
        if (!cur) return prev;
        const nextDone = !cur.done;
        void data.updateTask(id, { done: nextDone });
        return prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t));
      });
    },
    []
  );

  const toggleStar = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const cur = prev.find((t) => t.id === id);
        if (!cur) return prev;
        const nextStarred = !cur.starred;
        void data.updateTask(id, { starred: nextStarred });
        return prev.map((t) =>
          t.id === id ? { ...t, starred: nextStarred } : t
        );
      });
    },
    []
  );

  const addSub = useCallback((taskId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    void data
      .createSubtask(taskId, { text: trimmed, done: false })
      .then((result) => {
        if (result.ok) {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId ? { ...t, subs: [...t.subs, result.data] } : t
            )
          );
        }
      });
  }, []);

  const toggleSub = useCallback((taskId: string, subId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      const sub = task?.subs.find((s) => s.id === subId);
      if (!sub) return prev;
      const nextDone = !sub.done;
      void data.updateSubtask(subId, { done: nextDone });
      return prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              subs: t.subs.map((s) =>
                s.id === subId ? { ...s, done: nextDone } : s
              ),
            }
          : t
      );
    });
  }, []);

  const deleteSub = useCallback((taskId: string, subId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, subs: t.subs.filter((s) => s.id !== subId) } : t
      )
    );
    void data.deleteSubtask(subId);
  }, []);

  const value = useMemo<TasksContextValue>(
    () => ({
      tasks,
      addTask,
      updateTask,
      deleteTask,
      toggleDone,
      toggleStar,
      addSub,
      toggleSub,
      deleteSub,
    }),
    [
      tasks,
      addTask,
      updateTask,
      deleteTask,
      toggleDone,
      toggleStar,
      addSub,
      toggleSub,
      deleteSub,
    ]
  );

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within a TasksProvider');
  return ctx;
}
