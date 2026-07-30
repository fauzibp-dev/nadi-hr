create schema if not exists app;

create or replace function app.current_company_id() returns uuid language sql stable security definer set search_path=public,auth set row_security=off as $$
  select company_id from public.profiles where id=auth.uid() and is_active limit 1
$$;
create or replace function app.current_employee_id() returns uuid language sql stable security definer set search_path=public,auth set row_security=off as $$
  select employee_id from public.profiles where id=auth.uid() and is_active limit 1
$$;
create or replace function app.current_role() returns public.app_role language sql stable security definer set search_path=public,auth set row_security=off as $$
  select role from public.profiles where id=auth.uid() and is_active limit 1
$$;
create or replace function app.is_platform_admin() returns boolean language sql stable security definer set search_path=public,auth set row_security=off as $$
  select coalesce((select role='platform_admin' from public.profiles where id=auth.uid() and is_active),false)
$$;
create or replace function app.is_hr_admin() returns boolean language sql stable security definer set search_path=public,auth set row_security=off as $$
  select coalesce((select role in ('owner','hr') from public.profiles where id=auth.uid() and is_active),false)
$$;
create or replace function app.can_view_employee(target uuid) returns boolean language sql stable security definer set search_path=public,auth set row_security=off as $$
  select case
    when app.is_platform_admin() then true
    when target=app.current_employee_id() then true
    when app.is_hr_admin() then exists(select 1 from public.employees e where e.id=target and e.company_id=app.current_company_id())
    when app.current_role() in ('manager','supervisor') then exists(select 1 from public.employees e where e.id=target and e.company_id=app.current_company_id() and e.manager_id=app.current_employee_id())
    else false end
$$;

revoke all on schema app from public; grant usage on schema app to authenticated;
grant execute on all functions in schema app to authenticated;

-- Create a lightweight profile for every Auth user. Company/role assignment is completed by invitation/admin.
create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values(new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data->>'full_name',''),'employee')
  on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create table public.invitations (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  email text not null, role public.app_role not null default 'employee', employee_id uuid references public.employees(id) on delete cascade,
  token_hash text not null unique, expires_at timestamptz not null, accepted_at timestamptz, invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Tenant tables: enable RLS.
do $$ declare t text; begin
  foreach t in array array['companies','profiles','branches','departments','teams','employees','offices','employee_offices','shifts','schedules','holidays','employee_devices','face_profiles','onboarding_tasks','offboarding_tasks','attendance_challenges','attendance_events','attendance_daily','attendance_corrections','attendance_risk_flags','leave_types','leave_balances','requests','approval_workflows','approval_workflow_steps','request_approvals','overtime_records','shift_swap_requests','employee_documents','announcements','announcement_receipts','notifications','api_keys','webhooks','webhook_deliveries','subscriptions','feature_overrides','usage_daily','support_tickets','saved_reports','invitations'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

-- Company & profile
create policy companies_select on public.companies for select to authenticated using (id=app.current_company_id() or app.is_platform_admin());
create policy companies_update on public.companies for update to authenticated using (id=app.current_company_id() and app.is_hr_admin()) with check(id=app.current_company_id());
create policy profiles_select on public.profiles for select to authenticated using (id=auth.uid() or app.is_platform_admin() or (company_id=app.current_company_id() and app.is_hr_admin()));

-- Workforce directory
create policy employees_select on public.employees for select to authenticated using (app.can_view_employee(id));
create policy employees_manage on public.employees for all to authenticated using (company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());
create policy employee_devices_select on public.employee_devices for select to authenticated using(app.can_view_employee(employee_id));
create policy employee_devices_manage on public.employee_devices for all to authenticated using(company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());
create policy face_profiles_select on public.face_profiles for select to authenticated using(app.can_view_employee(employee_id));
create policy face_profiles_manage on public.face_profiles for all to authenticated using(company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());

-- Common company reference data. Readable by tenant users, writable by HR/owner.
do $$ declare t text; begin
  foreach t in array array['branches','departments','teams','offices','shifts','holidays','leave_types','announcements'] loop
    execute format('create policy %I_tenant_select on public.%I for select to authenticated using (company_id=app.current_company_id() or app.is_platform_admin())',t,t);
    execute format('create policy %I_hr_manage on public.%I for all to authenticated using (company_id=app.current_company_id() and app.is_hr_admin()) with check (company_id=app.current_company_id())',t,t);
  end loop;
end $$;

create policy employee_offices_select on public.employee_offices for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy employee_offices_manage on public.employee_offices for all to authenticated using(company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());
create policy schedules_select on public.schedules for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy schedules_manage on public.schedules for all to authenticated using(company_id=app.current_company_id() and (app.is_hr_admin() or (app.current_role() in ('manager','supervisor') and app.can_view_employee(employee_id)))) with check(company_id=app.current_company_id());

-- Attendance: own employee or management scope.
create policy attendance_events_select on public.attendance_events for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy attendance_daily_select on public.attendance_daily for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy attendance_corrections_select on public.attendance_corrections for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy attendance_corrections_insert on public.attendance_corrections for insert to authenticated with check(company_id=app.current_company_id() and employee_id=app.current_employee_id());
create policy attendance_corrections_manage on public.attendance_corrections for update to authenticated using(company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());
create policy attendance_risk_flags_select on public.attendance_risk_flags for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy attendance_risk_flags_manage on public.attendance_risk_flags for update to authenticated using(company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());

-- Requests & balances.
create policy requests_select on public.requests for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy requests_insert on public.requests for insert to authenticated with check(company_id=app.current_company_id() and employee_id=app.current_employee_id());
create policy requests_manage on public.requests for update to authenticated using(company_id=app.current_company_id() and (employee_id=app.current_employee_id() or app.is_hr_admin() or (app.current_role() in ('manager','supervisor') and app.can_view_employee(employee_id)))) with check(company_id=app.current_company_id());
create policy leave_balances_select on public.leave_balances for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy leave_balances_manage on public.leave_balances for all to authenticated using(company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());
create policy overtime_records_select on public.overtime_records for select to authenticated using(company_id=app.current_company_id() and app.can_view_employee(employee_id));
create policy shift_swap_select on public.shift_swap_requests for select to authenticated using(company_id=app.current_company_id() and (requester_employee_id=app.current_employee_id() or target_employee_id=app.current_employee_id() or app.is_hr_admin()));

-- HR workflow metadata only within the tenant scope.
create policy approval_workflows_scope on public.approval_workflows for all to authenticated
using(company_id=app.current_company_id() and app.current_role() in ('owner','hr','manager','supervisor'))
with check(company_id=app.current_company_id());
create policy approval_workflow_steps_scope on public.approval_workflow_steps for all to authenticated
using(exists(select 1 from public.approval_workflows w where w.id=approval_workflow_steps.workflow_id and w.company_id=app.current_company_id() and app.current_role() in ('owner','hr','manager','supervisor')))
with check(exists(select 1 from public.approval_workflows w where w.id=approval_workflow_steps.workflow_id and w.company_id=app.current_company_id() and app.current_role() in ('owner','hr','manager','supervisor')));
create policy request_approvals_scope on public.request_approvals for all to authenticated
using(company_id=app.current_company_id() and (app.is_hr_admin() or app.current_role() in ('manager','supervisor')))
with check(company_id=app.current_company_id());

create policy onboarding_scope on public.onboarding_tasks for all to authenticated
using(company_id=app.current_company_id() and (employee_id=app.current_employee_id() or app.is_hr_admin() or (app.current_role() in ('manager','supervisor') and app.can_view_employee(employee_id))))
with check(company_id=app.current_company_id());
create policy offboarding_scope on public.offboarding_tasks for all to authenticated
using(company_id=app.current_company_id() and (employee_id=app.current_employee_id() or app.is_hr_admin() or (app.current_role() in ('manager','supervisor') and app.can_view_employee(employee_id))))
with check(company_id=app.current_company_id());

-- Employee documents: employee sees own employee-visible docs; management sees scoped docs.
create policy documents_select on public.employee_documents for select to authenticated using(company_id=app.current_company_id() and (employee_id=app.current_employee_id() or (app.can_view_employee(employee_id) and app.current_role() in ('owner','hr','manager','supervisor'))));
create policy documents_manage on public.employee_documents for all to authenticated using(company_id=app.current_company_id() and app.is_hr_admin()) with check(company_id=app.current_company_id());
create policy announcement_receipts_select on public.announcement_receipts for select to authenticated using(employee_id=app.current_employee_id() or (app.is_hr_admin() and exists(select 1 from public.employees e where e.id=employee_id and e.company_id=app.current_company_id())));
create policy announcement_receipts_insert on public.announcement_receipts for insert to authenticated with check(employee_id=app.current_employee_id());
create policy notifications_own on public.notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_own_update on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- Tenant integrations and reports only HR/owner.
do $$ declare t text; begin
  foreach t in array array['api_keys','webhooks','webhook_deliveries','saved_reports','invitations'] loop
    execute format('create policy %I_hr on public.%I for all to authenticated using (company_id=app.current_company_id() and app.is_hr_admin()) with check (company_id=app.current_company_id())',t,t);
  end loop;
end $$;

-- Subscription/usage: tenant owner/HR can read, platform admin manages.
create policy subscriptions_read on public.subscriptions for select to authenticated using(company_id=app.current_company_id() or app.is_platform_admin());
create policy feature_overrides_read on public.feature_overrides for select to authenticated using(company_id=app.current_company_id() or app.is_platform_admin());
create policy usage_read on public.usage_daily for select to authenticated using(company_id=app.current_company_id() or app.is_platform_admin());
create policy support_read on public.support_tickets for select to authenticated using(company_id=app.current_company_id() or app.is_platform_admin());
create policy support_insert on public.support_tickets for insert to authenticated with check(company_id=app.current_company_id());

-- Platform-only tables.
alter table public.plans enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_events enable row level security;
create policy plans_read on public.plans for select to authenticated using(true);
create policy plans_platform_manage on public.plans for all to authenticated using(app.is_platform_admin()) with check(app.is_platform_admin());
create policy audit_scope on public.audit_logs for select to authenticated using(app.is_platform_admin() or (company_id=app.current_company_id() and app.is_hr_admin()));
create policy system_events_platform on public.system_events for select to authenticated using(app.is_platform_admin());

-- Private storage buckets. Attendance evidence is written by server/service role.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('attendance-evidence','attendance-evidence',false,1048576,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
insert into storage.buckets(id,name,public,file_size_limit)
values('employee-documents','employee-documents',false,10485760) on conflict(id) do nothing;

-- Authenticated users can read evidence only when event RLS proves ownership/scope.
create policy attendance_evidence_read on storage.objects for select to authenticated using(
  bucket_id='attendance-evidence' and exists(select 1 from public.attendance_events e where e.evidence_path=name and app.can_view_employee(e.employee_id))
);
create policy employee_documents_storage_read on storage.objects for select to authenticated using(
  bucket_id='employee-documents' and exists(select 1 from public.employee_documents d where d.storage_path=name and d.company_id=app.current_company_id() and (d.employee_id=app.current_employee_id() or app.is_hr_admin()))
);

-- Realtime: expose selected operational tables. Ignore duplicate errors on rerun manually.
alter publication supabase_realtime add table public.attendance_events;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.requests;
