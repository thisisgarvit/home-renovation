-- Renovation tracker: database setup for Supabase.
-- Run the whole file once in Supabase → SQL Editor → New query → Run. It is safe to run again.
-- Before running, replace CHANGE-ME below with your family code (the same value as FAMILY_CODE in Vercel).

-- ---------------------------------------------------------------------------
-- Family code: every request must carry it in the x-family-key header.
-- ---------------------------------------------------------------------------
create schema if not exists private;

create table if not exists private.app_config (
  key text primary key,
  value text not null
);

insert into private.app_config (key, value)
values ('family_code', 'CHANGE-ME')
on conflict (key) do nothing;

-- To change the code later:
--   update private.app_config set value = 'new-code' where key = 'family_code';

create or replace function public.check_family_code()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::json ->> 'x-family-key'
      = (select value from private.app_config where key = 'family_code'),
    false
  );
$$;

revoke all on function public.check_family_code() from public;
grant execute on function public.check_family_code() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.crews (
  id uuid primary key,
  trade text not null,
  name text not null,
  people integer not null default 1,
  rate numeric(10, 2) not null default 0,
  start_date date not null,
  end_date date,
  holidays date[] not null default '{}',
  added_by text not null,
  sample boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key,
  kind text not null check (kind in ('expense', 'return')),
  date date not null,
  amount numeric(12, 2) not null,
  cat text not null,
  other text not null default '',
  mat_type text,
  mat_note text not null default '',
  room text not null,
  crew_id uuid references public.crews (id) on delete set null,
  paid_by text,
  payee text not null default '',
  mode text,
  note text not null default '',
  added_by text not null,
  return_of uuid references public.expenses (id) on delete cascade,
  receipts jsonb not null default '[]',
  deleted jsonb,
  history jsonb not null default '[]',
  sample boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key,
  title text not null,
  who text not null,
  room text,
  due date,
  done boolean not null default false,
  done_by text,
  done_at date,
  added_by text not null,
  sample boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key,
  name text not null,
  room text,
  date date not null,
  added_by text not null,
  provider text not null default 'local',
  file_id text,
  sample boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id text primary key,
  value text not null,
  added_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (date desc);
create index if not exists expenses_return_of_idx on public.expenses (return_of);
create index if not exists expenses_crew_idx on public.expenses (crew_id);

-- Keep updated_at current on every change.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['crews', 'expenses', 'tasks', 'photos', 'settings'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security: only requests with the family code can read or write.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['crews', 'expenses', 'tasks', 'photos', 'settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists family_only on public.%I', t);
    execute format(
      'create policy family_only on public.%I for all to anon, authenticated using (public.check_family_code()) with check (public.check_family_code())',
      t
    );
    execute format('grant select, insert, update, delete on public.%I to anon, authenticated', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private bucket for photos (used when Google Drive is not connected).
-- The app never reads it directly: /api/photo fetches files with the service key.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;
