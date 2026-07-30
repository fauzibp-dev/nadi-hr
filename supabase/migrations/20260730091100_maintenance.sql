create or replace function public.run_platform_maintenance() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions,storage as $$
declare c record; v_date date; v_absent integer:=0; v_companies integer:=0; v_rows integer;
begin
  for c in select id,timezone from public.companies where status='active' loop
    v_companies:=v_companies+1;
    v_date:=((now() at time zone c.timezone)::date-1);
    insert into public.attendance_daily(company_id,employee_id,work_date,schedule_id,status)
    select s.company_id,s.employee_id,s.work_date,s.id,'absent'
    from public.schedules s join public.employees e on e.id=s.employee_id
    where s.company_id=c.id and s.work_date=v_date and s.work_mode<>'off' and e.archived_at is null
      and not exists(select 1 from public.holidays h where h.company_id=c.id and h.holiday_date=v_date and (h.branch_id is null or h.branch_id=e.branch_id))
      and not exists(select 1 from public.attendance_daily d where d.employee_id=s.employee_id and d.work_date=s.work_date)
    on conflict(employee_id,work_date) do nothing;
    get diagnostics v_rows=row_count; v_absent:=v_absent+v_rows;

    insert into public.usage_daily(company_id,usage_date,active_employees,attendance_events,face_verifications)
    values(c.id,v_date,
      (select count(*) from public.employees e where e.company_id=c.id and e.archived_at is null),
      (select count(*) from public.attendance_events a where a.company_id=c.id and (a.event_time at time zone c.timezone)::date=v_date),
      (select count(*) from public.attendance_events a where a.company_id=c.id and (a.event_time at time zone c.timezone)::date=v_date and a.face_status='verified'))
    on conflict(company_id,usage_date) do update set active_employees=excluded.active_employees,attendance_events=excluded.attendance_events,face_verifications=excluded.face_verifications;
  end loop;
  update public.subscriptions set status='suspended',updated_at=now() where status='trial' and trial_ends_at is not null and trial_ends_at<now();
  update public.companies c set status='suspended',updated_at=now() where exists(select 1 from public.subscriptions s where s.company_id=c.id and s.status in ('suspended','cancelled'));
  return jsonb_build_object('ok',true,'companies',v_companies,'absent_rows_created',v_absent,'run_at',now());
end $$;
revoke all on function public.run_platform_maintenance() from public,anon,authenticated;
grant execute on function public.run_platform_maintenance() to service_role;
