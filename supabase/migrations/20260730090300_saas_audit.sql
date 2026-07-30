create table public.plans (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, price_monthly_idr bigint,
  employee_limit integer, office_limit integer, trial_days integer not null default 14, is_active boolean not null default true,
  features jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), company_id uuid not null unique references public.companies(id) on delete cascade,
  plan_id uuid not null references public.plans(id), status public.subscription_status not null default 'trial',
  starts_at timestamptz not null default now(), trial_ends_at timestamptz, current_period_start timestamptz not null default now(),
  current_period_end timestamptz, grace_ends_at timestamptz, external_customer_id text, external_subscription_id text,
  metadata jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create trigger subscriptions_touch before update on public.subscriptions for each row execute function public.touch_updated_at();

create table public.feature_overrides (
  company_id uuid not null references public.companies(id) on delete cascade, feature_key text not null, enabled boolean not null,
  config jsonb not null default '{}'::jsonb, primary key(company_id,feature_key)
);
create table public.usage_daily (
  company_id uuid not null references public.companies(id) on delete cascade, usage_date date not null,
  active_employees integer not null default 0, attendance_events integer not null default 0, storage_bytes bigint not null default 0,
  face_verifications integer not null default 0, api_calls integer not null default 0, exports integer not null default 0,
  primary key(company_id,usage_date)
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(), company_id uuid references public.companies(id) on delete set null,
  opened_by uuid references auth.users(id) on delete set null, title text not null, description text not null,
  severity text not null default 'low' check(severity in ('low','medium','high','critical')),
  status text not null default 'open' check(status in ('open','investigating','waiting_customer','resolved','closed')),
  assigned_to uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger support_touch before update on public.support_tickets for each row execute function public.touch_updated_at();

create table public.audit_logs (
  id bigint generated always as identity primary key, company_id uuid references public.companies(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null, actor_role text, action text not null, entity_type text, entity_id text,
  before_data jsonb, after_data jsonb, reason text, ip inet, user_agent text, created_at timestamptz not null default now()
);
create index audit_logs_company_time_idx on public.audit_logs(company_id,created_at desc);

create table public.system_events (
  id bigint generated always as identity primary key, level text not null default 'info' check(level in ('info','warning','error','critical')),
  service text not null, event_key text not null, message text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table public.saved_reports (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  owner_user_id uuid references auth.users(id) on delete set null, name text not null, report_type text not null, filters jsonb not null default '{}'::jsonb,
  schedule jsonb, created_at timestamptz not null default now()
);

create or replace view public.v_attendance_monthly with (security_invoker = true) as
select company_id, employee_id, date_trunc('month',work_date)::date month,
 count(*) filter(where status in ('present','late')) present_days,
 count(*) filter(where status='late') late_days,
 count(*) filter(where status='absent') absent_days,
 sum(worked_minutes) worked_minutes, sum(overtime_minutes) overtime_minutes
from public.attendance_daily group by company_id,employee_id,date_trunc('month',work_date);
