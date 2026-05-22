# Phase 1 Data Model: Supabase Auth & Cloud Sync

**Date**: 2026-05-22 | **Feature**: 002-supabase-auth

이 문서는 Postgres 스키마와 RLS 정책을 정의한다. SQL 형태는 `supabase/migrations/` 에
파일로 저장되며 Supabase MCP `apply_migration` 으로 적용된다.

---

## Entities

### User (Supabase Auth 관리)

| Field         | Type        | Notes                                |
|---------------|-------------|--------------------------------------|
| id            | uuid (PK)   | `auth.users.id` — Supabase 가 관리      |
| email         | text        | 이메일/비밀번호 가입 시 채움            |
| created_at    | timestamptz | Supabase Auth 기본                    |

> 직접 다루지 않음. `auth.users` 테이블은 Supabase 가 제공. 우리 테이블의 FK 타깃으로만 사용.

---

### Task

기존 `src/lib/types.ts` 의 `Task` 와 동일한 도메인 모델, 서버 표현은 snake_case 컬럼.

| Field        | Type           | Required | Default                  | Notes                          |
|--------------|----------------|----------|--------------------------|--------------------------------|
| id           | uuid           | YES (PK) | `gen_random_uuid()`      |                                |
| user_id      | uuid           | YES (FK) | —                        | `auth.users(id) ON DELETE CASCADE` |
| title        | text           | YES      | —                        | 빈 문자열 금지(CHECK length > 0) |
| due          | date           | NO       | NULL                     | TS `due: 'YYYY-MM-DD' \| ''` 와 매핑 |
| priority     | text           | YES      | `'none'`                 | CHECK in ('high','med','low','none') |
| category     | text           | YES      | `'personal'`             | CHECK in ('design','dev','meeting','plan','personal') |
| starred      | boolean        | YES      | `false`                  |                                |
| done         | boolean        | YES      | `false`                  |                                |
| notes        | text           | YES      | `''`                     |                                |
| sort_order   | integer        | YES      | `0`                      | 안정적 정렬을 위한 정수 키       |
| created_at   | timestamptz    | YES      | `now()`                  |                                |
| updated_at   | timestamptz    | YES      | `now()`                  | 트리거로 갱신                   |

**Indexes**:

- `idx_tasks_user_id_created_at` on `(user_id, created_at DESC)` — 사용자별 최신 조회
- `idx_tasks_user_id_due` on `(user_id, due)` — 캘린더/오버듀 필터

**RLS**: ENABLED. 정책: `auth.uid() = user_id` for SELECT, INSERT (WITH CHECK), UPDATE, DELETE.

**Validation rules** (spec 매핑):

- `title` 비어있을 수 없음(클라이언트 + CHECK 제약).
- `due` 는 ISO 'YYYY-MM-DD'. 빈 문자열 표현은 클라이언트→서버 변환 시 NULL 로 매핑.
- `priority`, `category` 는 위 enum 값만 허용.

---

### Subtask

| Field        | Type           | Required | Default                  | Notes                          |
|--------------|----------------|----------|--------------------------|--------------------------------|
| id           | uuid           | YES (PK) | `gen_random_uuid()`      |                                |
| task_id      | uuid           | YES (FK) | —                        | `tasks(id) ON DELETE CASCADE`  |
| user_id      | uuid           | YES (FK) | —                        | `auth.users(id) ON DELETE CASCADE`. 부모 `tasks.user_id` 와 동일해야 함(트리거/CHECK). |
| text         | text           | YES      | —                        | CHECK length > 0               |
| done         | boolean        | YES      | `false`                  |                                |
| sort_order   | integer        | YES      | `0`                      |                                |
| created_at   | timestamptz    | YES      | `now()`                  |                                |

**Indexes**:

- `idx_subtasks_task_id` on `(task_id, sort_order)` — 한 할 일의 하위 작업 정렬 조회.

**RLS**: ENABLED. 정책: `auth.uid() = user_id` for SELECT/INSERT/UPDATE/DELETE.

**Integrity rule**: `subtasks.user_id` 는 항상 `(SELECT user_id FROM tasks WHERE id = subtasks.task_id)`
와 같아야 한다 → INSERT/UPDATE 시 트리거로 강제(부모에서 자동 채움).

---

## State transitions

| Entity | From → To              | Trigger                          |
|--------|------------------------|----------------------------------|
| Task   | done=false → done=true | 사용자가 체크박스 토글             |
| Task   | starred=false → true   | 사용자가 별표 토글                 |
| Task   | (any) → deleted        | 사용자가 삭제(쿠키 즉시 hard delete)|
| Subtask| done=false → done=true | 사용자가 하위 작업 체크박스 토글    |

> 별도 상태 머신은 없음. boolean 토글 + CRUD 만.

---

## Migrations (SQL outline)

### `supabase/migrations/0001_create_tasks_table.sql`

```sql
create extension if not exists "pgcrypto";

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null check (length(title) > 0),
  due         date,
  priority    text not null default 'none'
              check (priority in ('high','med','low','none')),
  category    text not null default 'personal'
              check (category in ('design','dev','meeting','plan','personal')),
  starred     boolean not null default false,
  done        boolean not null default false,
  notes       text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_tasks_user_id_created_at
  on public.tasks (user_id, created_at desc);
create index idx_tasks_user_id_due
  on public.tasks (user_id, due);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tasks enable row level security;

create policy "tasks_select_own"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks_insert_own"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks_update_own"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks_delete_own"
  on public.tasks for delete
  using (auth.uid() = user_id);
```

### `supabase/migrations/0002_create_subtasks_table.sql`

```sql
create table public.subtasks (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null check (length(text) > 0),
  done        boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_subtasks_task_id
  on public.subtasks (task_id, sort_order);

-- Ensure subtasks.user_id == tasks.user_id automatically
create or replace function public.subtasks_set_user_id()
returns trigger language plpgsql as $$
begin
  select user_id into new.user_id from public.tasks where id = new.task_id;
  if new.user_id is null then
    raise exception 'parent task not found or has no user_id';
  end if;
  return new;
end $$;

create trigger trg_subtasks_set_user_id
  before insert on public.subtasks
  for each row execute function public.subtasks_set_user_id();

-- RLS
alter table public.subtasks enable row level security;

create policy "subtasks_select_own"
  on public.subtasks for select
  using (auth.uid() = user_id);

create policy "subtasks_insert_own"
  on public.subtasks for insert
  with check (auth.uid() = user_id);

create policy "subtasks_update_own"
  on public.subtasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "subtasks_delete_own"
  on public.subtasks for delete
  using (auth.uid() = user_id);
```

---

## TypeScript ↔ DB mapping

`src/lib/types.ts` 의 `Task` 는 클라이언트 도메인 모델. DB row 와 동등하지만:

| TS field        | DB column   | Note                          |
|-----------------|-------------|-------------------------------|
| `id`            | `id`        | uuid                          |
| `title`         | `title`     |                               |
| `due` (`''`)    | `due` (NULL)| 빈 문자열은 NULL 로 변환       |
| `priority`      | `priority`  |                               |
| `category`      | `category`  |                               |
| `starred`       | `starred`   |                               |
| `done`          | `done`      |                               |
| `notes`         | `notes`     |                               |
| `subs`          | (별도 table)| `subtasks.task_id = tasks.id` |

매핑 함수는 `src/lib/data/tasks.ts` 의 `rowToTask(row)` / `taskToRow(task, userId)` 에서 단일
지점으로 처리한다.
