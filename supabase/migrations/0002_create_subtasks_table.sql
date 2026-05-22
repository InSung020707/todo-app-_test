-- 0002_create_subtasks_table.sql
-- Creates the public.subtasks table. subtasks.user_id is denormalized
-- from the parent task and auto-populated by a BEFORE INSERT trigger so
-- RLS policies can use a simple auth.uid() = user_id rule.

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

-- Auto-fill user_id from the parent task so callers don't have to.
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

-- Row Level Security
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
