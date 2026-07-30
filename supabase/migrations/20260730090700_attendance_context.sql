create or replace function public.get_attendance_context() returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_emp public.employees%rowtype; v_company public.companies%rowtype; v_office public.offices%rowtype;
  v_schedule public.schedules%rowtype; v_date date; v_local_time time; v_lat double precision; v_lon double precision;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_emp from public.employees where user_id=auth.uid() and archived_at is null limit 1;
  if v_emp.id is null then raise exception 'EMPLOYEE_NOT_LINKED'; end if;
  select * into v_company from public.companies where id=v_emp.company_id;
  v_date:=(now() at time zone v_company.timezone)::date; v_local_time:=(now() at time zone v_company.timezone)::time;
  select s.* into v_schedule from public.schedules s left join public.shifts sh on sh.id=s.shift_id
  where s.employee_id=v_emp.id and (s.work_date=v_date or (s.work_date=v_date-1 and sh.end_time<=sh.start_time and v_local_time<=sh.end_time))
  order by s.work_date desc limit 1;
  select o.* into v_office
  from public.offices o join public.employee_offices eo on eo.office_id=o.id
  where eo.employee_id=v_emp.id and o.is_active
    and (eo.valid_from is null or eo.valid_from<=v_date) and (eo.valid_until is null or eo.valid_until>=v_date)
  order by case when o.id=v_schedule.office_id then 0 else 1 end, o.created_at asc limit 1;
  if v_office.id is not null then
    v_lat:=extensions.st_y(v_office.location::extensions.geometry);
    v_lon:=extensions.st_x(v_office.location::extensions.geometry);
  end if;
  return jsonb_build_object(
    'employeeId',v_emp.id,'companyId',v_emp.company_id,'workMode',coalesce(v_schedule.work_mode,'office'),
    'office',case when v_office.id is null then null else jsonb_build_object('id',v_office.id,'name',v_office.name,'latitude',v_lat,'longitude',v_lon,'radius',v_office.radius_m,'maxAccuracy',v_office.max_accuracy_m,'timezone',v_office.timezone) end,
    'faceProviderRequired',coalesce((v_company.attendance_policy->>'require_face_provider')::boolean,false),
    'knownDeviceRequired',coalesce((v_company.attendance_policy->>'require_known_device')::boolean,false)
  );
end $$;
revoke all on function public.get_attendance_context() from public;
grant execute on function public.get_attendance_context() to authenticated;
