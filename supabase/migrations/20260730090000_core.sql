-- Nadi HR · Core multi-tenant schema
-- Run with Supabase CLI: supabase db push
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create type public.app_role as enum ('platform_admin','owner','hr','manager','supervisor','employee');
create type public.employment_status as enum ('probation','permanent','contract','intern','freelance','resigned','terminated');
create type public.subscription_status as enum ('trial','active','past_due','suspended','cancelled');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  timezone text not null default 'Asia/Jakarta',
  locale text not null default 'id-ID',
  primary_color text not null default '#123b2a',
  attendance_policy jsonb not null default '{"default_radius_m":50,"max_accuracy_m":30,"duplicate_window_s":30,"checkin_early_m":30,"grace_m":10,"require_face_provider":false,"require_known_device":false}'::jsonb,
  data_retention jsonb not null default '{"attendance_selfie_days":90,"audit_months":24,"employee_documents_years":5}'::jsonb,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  employee_id uuid,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, code text, address text, is_active boolean not null default true, created_at timestamptz not null default now(),
  unique(company_id, code)
);
create table public.departments (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null, name text not null, code text, is_active boolean not null default true,
  unique(company_id, code)
);
create table public.teams (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  department_id uuid references public.departments(id) on delete cascade, name text not null, manager_employee_id uuid
);

create table public.employees (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  employee_number text not null, full_name text not null, preferred_name text, email text, phone text,
  branch_id uuid references public.branches(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  manager_id uuid references public.employees(id) on delete set null,
  job_title text, employment_status public.employment_status not null default 'contract',
  joined_at date, last_working_day date, photo_url text, emergency_contact jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id, employee_number)
);
alter table public.profiles add constraint profiles_employee_id_fkey foreign key (employee_id) references public.employees(id) on delete set null;
alter table public.teams add constraint teams_manager_employee_id_fkey foreign key (manager_employee_id) references public.employees(id) on delete set null;

create table public.offices (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null, name text not null, address text,
  location extensions.geography(point,4326) not null,
  radius_m integer not null default 50 check (radius_m between 10 and 10000),
  max_accuracy_m integer not null default 30 check (max_accuracy_m between 5 and 500),
  timezone text not null default 'Asia/Jakarta', is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, name)
);
create index offices_location_gix on public.offices using gist(location);
create table public.employee_offices (
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  office_id uuid not null references public.offices(id) on delete cascade,
  valid_from date, valid_until date, primary key(employee_id,office_id)
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  name text not null, code text, start_time time not null, end_time time not null,
  break_minutes integer not null default 60, grace_minutes integer not null default 10, early_checkin_minutes integer not null default 30,
  min_work_minutes integer not null default 0, color text, is_active boolean not null default true,
  unique(company_id, code)
);
create table public.schedules (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, shift_id uuid references public.shifts(id) on delete set null,
  work_date date not null, work_mode text not null default 'office' check(work_mode in ('office','wfh','field','business_trip','off')),
  office_id uuid references public.offices(id) on delete set null, planned_location extensions.geography(point,4326), planned_radius_m integer,
  override_start timestamptz, override_end timestamptz, note text, created_at timestamptz not null default now(),
  unique(employee_id, work_date)
);
create index schedules_employee_date_idx on public.schedules(employee_id,work_date);

create table public.holidays (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  holiday_date date not null, name text not null, branch_id uuid references public.branches(id) on delete cascade,
  unique(company_id,holiday_date,branch_id)
);

create table public.employee_devices (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, credential_id text, device_label text,
  device_hash text, platform text, trusted boolean not null default false, attendance_allowed boolean not null default true,
  last_seen_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(),
  unique(employee_id,device_hash)
);
create index employee_devices_employee_idx on public.employee_devices(employee_id) where revoked_at is null;

create table public.face_profiles (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, status text not null default 'pending' check(status in ('pending','enrolled','reset_requested','disabled')),
  provider text, provider_subject_id text, model_version text, enrollment_evidence_path text, enrolled_at timestamptz, reset_requested_at timestamptz,
  unique(employee_id)
);

create table public.onboarding_tasks (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, task_key text not null, title text not null,
  status text not null default 'todo' check(status in ('todo','in_progress','done','waived')), completed_at timestamptz,
  unique(employee_id,task_key)
);

create table public.offboarding_tasks (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, task_key text not null, title text not null,
  status text not null default 'todo' check(status in ('todo','in_progress','done','waived')), completed_at timestamptz,
  unique(employee_id,task_key)
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger companies_touch before update on public.companies for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger employees_touch before update on public.employees for each row execute function public.touch_updated_at();
