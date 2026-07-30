create type public.request_type as enum ('leave','sick','permission','overtime','attendance_correction','wfh','business_trip','shift_swap');
create type public.request_status as enum ('draft','pending','approved','rejected','cancelled');

create table public.leave_types (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, code text not null, annual_quota numeric(6,2), paid boolean not null default true, requires_attachment boolean not null default false,
  accrual_policy jsonb not null default '{}'::jsonb, is_active boolean not null default true, unique(company_id,code)
);
create table public.leave_balances (
  company_id uuid not null references public.companies(id) on delete cascade, employee_id uuid not null references public.employees(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade, year integer not null, opening numeric(6,2) not null default 0,
  accrued numeric(6,2) not null default 0, used numeric(6,2) not null default 0, adjustment numeric(6,2) not null default 0,
  primary key(employee_id,leave_type_id,year)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, request_type public.request_type not null,
  status public.request_status not null default 'pending', starts_at timestamptz, ends_at timestamptz, work_date date,
  reason text not null, attachment_path text, payload jsonb not null default '{}'::jsonb,
  current_step integer not null default 1, submitted_at timestamptz not null default now(), decided_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger requests_touch before update on public.requests for each row execute function public.touch_updated_at();

create table public.approval_workflows (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, request_type public.request_type not null, branch_id uuid references public.branches(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade, is_default boolean not null default false, is_active boolean not null default true
);
create table public.approval_workflow_steps (
  id uuid primary key default gen_random_uuid(), workflow_id uuid not null references public.approval_workflows(id) on delete cascade,
  step_no integer not null, approver_type text not null check(approver_type in ('supervisor','manager','hr','owner','specific_user')),
  approver_user_id uuid references auth.users(id) on delete set null, required boolean not null default true, unique(workflow_id,step_no)
);
create table public.request_approvals (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade, step_no integer not null, approver_user_id uuid references auth.users(id) on delete set null,
  decision text check(decision in ('approved','rejected')), note text, decided_at timestamptz, created_at timestamptz not null default now(), unique(request_id,step_no)
);

create table public.overtime_records (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, request_id uuid references public.requests(id) on delete set null,
  work_date date not null, approved_start timestamptz, approved_end timestamptz, actual_start timestamptz, actual_end timestamptz,
  approved_minutes integer not null default 0, actual_minutes integer not null default 0, rounding_minutes integer not null default 15,
  status text not null default 'planned' check(status in ('planned','running','completed','cancelled'))
);

create table public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  requester_employee_id uuid not null references public.employees(id) on delete cascade, target_employee_id uuid not null references public.employees(id) on delete cascade,
  requester_schedule_id uuid references public.schedules(id) on delete cascade, target_schedule_id uuid references public.schedules(id) on delete cascade,
  request_id uuid references public.requests(id) on delete cascade, peer_accepted_at timestamptz
);

create table public.employee_documents (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete cascade, category text not null, title text not null, storage_path text not null,
  mime_type text, size_bytes bigint, visibility text not null default 'hr' check(visibility in ('employee','manager','hr','owner')),
  expires_at date, verified_at timestamptz, uploaded_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  title text not null, body text not null, target jsonb not null default '{"type":"all"}'::jsonb,
  acknowledgement_required boolean not null default false, published_at timestamptz, scheduled_at timestamptz, expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table public.announcement_receipts (
  announcement_id uuid not null references public.announcements(id) on delete cascade, employee_id uuid not null references public.employees(id) on delete cascade,
  read_at timestamptz not null default now(), acknowledged_at timestamptz, primary key(announcement_id,employee_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, category text not null, title text not null, body text,
  href text, read_at timestamptz, created_at timestamptz not null default now()
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, key_prefix text not null, key_hash text not null, scopes text[] not null default '{}', last_used_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table public.webhooks (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, url text not null, secret_hash text not null, events text[] not null default '{}', is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  webhook_id uuid not null references public.webhooks(id) on delete cascade, event_key text not null, payload jsonb not null,
  status_code integer, attempt integer not null default 1, delivered_at timestamptz, error text, created_at timestamptz not null default now()
);
