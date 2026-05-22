-- 0001_create_tasks_table.sql
-- Creates the public.tasks table backing the demodev Todo app, with RLS
-- enforcing that each row is only accessible to its owner.

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

-- Row Level Security
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
