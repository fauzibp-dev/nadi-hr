alter table public.companies add column if not exists custom_domain text unique;
alter table public.companies add column if not exists billing_email text;

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  consent_type text not null check(consent_type in ('privacy_policy','location_processing','biometric_processing','communications')),
  policy_version text not null,
  granted boolean not null,
  captured_at timestamptz not null default now(),
  revoked_at timestamptz,
  evidence jsonb not null default '{}'::jsonb
);
create index consent_employee_idx on public.consent_records(employee_id,consent_type,captured_at desc);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  request_type text not null check(request_type in ('access','correction','deletion','restriction','export')),
  status text not null default 'open' check(status in ('open','in_review','completed','rejected')),
  note text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  handled_by uuid references auth.users(id) on delete set null
);

alter table public.consent_records enable row level security;
alter table public.privacy_requests enable row level security;
create policy consent_scope on public.consent_records for select to authenticated
using(company_id=app.current_company_id() and (employee_id=app.current_employee_id() or app.is_hr_admin()));
create policy consent_own_insert on public.consent_records for insert to authenticated
with check(company_id=app.current_company_id() and employee_id=app.current_employee_id());
create policy privacy_request_scope on public.privacy_requests for select to authenticated
using(company_id=app.current_company_id() and (employee_id=app.current_employee_id() or app.is_hr_admin()));
create policy privacy_request_insert on public.privacy_requests for insert to authenticated
with check(company_id=app.current_company_id() and employee_id=app.current_employee_id());
create policy privacy_request_hr_update on public.privacy_requests for update to authenticated
using(company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());
