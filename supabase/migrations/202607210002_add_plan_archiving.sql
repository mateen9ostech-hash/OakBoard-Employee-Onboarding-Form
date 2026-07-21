alter table public.onboarding_plans
  add column if not exists archived_at timestamptz;

create index if not exists onboarding_plans_owner_active_idx
  on public.onboarding_plans(owner_id, updated_at desc)
  where archived_at is null;
