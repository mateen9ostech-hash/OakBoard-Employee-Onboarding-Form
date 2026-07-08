-- OakBoard import system schema
-- Stores generated plans, AI/PDF/email imports, and email delivery logs.

create extension if not exists "pgcrypto";

create table if not exists public.onboarding_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Onboarding Plan',
  role text not null default '',
  reports_to text not null default '',
  collaborates_with text not null default '',
  duration_weeks integer not null check (duration_weeks in (2, 4)),
  plan_json jsonb not null,
  source_import_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('email_text', 'pdf_text', 'notebooklm_text', 'manual_text')),
  source_filename text,
  raw_text text not null,
  parser_provider text not null default 'manual',
  parser_model text,
  preferred_weeks integer check (preferred_weeks in (2, 4)),
  parsed_json jsonb,
  status text not null default 'draft' check (status in ('draft', 'parsed', 'applied', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'onboarding_plans_source_import_id_fkey'
      and conrelid = 'public.onboarding_plans'::regclass
  ) then
    alter table public.onboarding_plans
      add constraint onboarding_plans_source_import_id_fkey
      foreign key (source_import_id)
      references public.onboarding_imports(id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.onboarding_email_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.onboarding_plans(id) on delete set null,
  recipient_email text not null,
  cc_email text,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null check (status in ('sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists onboarding_plans_owner_created_idx
  on public.onboarding_plans(owner_id, created_at desc);

create index if not exists onboarding_imports_owner_created_idx
  on public.onboarding_imports(owner_id, created_at desc);

create index if not exists onboarding_email_logs_owner_created_idx
  on public.onboarding_email_logs(owner_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_onboarding_plans_updated_at on public.onboarding_plans;
create trigger set_onboarding_plans_updated_at
before update on public.onboarding_plans
for each row execute function public.set_updated_at();

drop trigger if exists set_onboarding_imports_updated_at on public.onboarding_imports;
create trigger set_onboarding_imports_updated_at
before update on public.onboarding_imports
for each row execute function public.set_updated_at();

alter table public.onboarding_plans enable row level security;
alter table public.onboarding_imports enable row level security;
alter table public.onboarding_email_logs enable row level security;

drop policy if exists "Users can read their own onboarding plans" on public.onboarding_plans;
create policy "Users can read their own onboarding plans"
on public.onboarding_plans for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can insert their own onboarding plans" on public.onboarding_plans;
create policy "Users can insert their own onboarding plans"
on public.onboarding_plans for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Users can update their own onboarding plans" on public.onboarding_plans;
create policy "Users can update their own onboarding plans"
on public.onboarding_plans for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can delete their own onboarding plans" on public.onboarding_plans;
create policy "Users can delete their own onboarding plans"
on public.onboarding_plans for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can read their own onboarding imports" on public.onboarding_imports;
create policy "Users can read their own onboarding imports"
on public.onboarding_imports for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can insert their own onboarding imports" on public.onboarding_imports;
create policy "Users can insert their own onboarding imports"
on public.onboarding_imports for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Users can update their own onboarding imports" on public.onboarding_imports;
create policy "Users can update their own onboarding imports"
on public.onboarding_imports for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can read their own onboarding email logs" on public.onboarding_email_logs;
create policy "Users can read their own onboarding email logs"
on public.onboarding_email_logs for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Users can insert their own onboarding email logs" on public.onboarding_email_logs;
create policy "Users can insert their own onboarding email logs"
on public.onboarding_email_logs for insert
to authenticated
with check (owner_id = auth.uid());
