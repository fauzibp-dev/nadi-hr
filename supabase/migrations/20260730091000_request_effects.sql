create unique index if not exists overtime_records_request_uq on public.overtime_records(request_id) where request_id is not null;

create or replace function public.apply_approved_request() returns trigger
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_company public.companies%rowtype; v_start_date date; v_end_date date; v_day date; v_status text;
  v_leave_type uuid; v_leave_days numeric:=0; v_daily public.attendance_daily%rowtype;
  v_correction public.attendance_corrections%rowtype; v_ci timestamptz; v_co timestamptz;
  v_swap public.shift_swap_requests%rowtype; v_req_schedule public.schedules%rowtype; v_target_schedule public.schedules%rowtype;
begin
  if new.status<>'approved' or old.status='approved' then return new; end if;
  select * into v_company from public.companies where id=new.company_id;
  v_start_date:=coalesce(new.work_date,case when new.starts_at is null then null else (new.starts_at at time zone v_company.timezone)::date end);
  v_end_date:=coalesce(case when new.ends_at is null then null else (new.ends_at at time zone v_company.timezone)::date end,v_start_date);

  if new.request_type in ('leave','sick','permission') and v_start_date is not null then
    v_status:=case new.request_type when 'leave' then 'leave' when 'sick' then 'sick' else 'permission' end;
    for v_day in select generate_series(v_start_date,v_end_date,interval '1 day')::date loop
      if new.work_date is not null or exists(select 1 from public.schedules s where s.employee_id=new.employee_id and s.work_date=v_day and s.work_mode<>'off') then
        insert into public.attendance_daily(company_id,employee_id,work_date,schedule_id,status)
        values(new.company_id,new.employee_id,v_day,(select s.id from public.schedules s where s.employee_id=new.employee_id and s.work_date=v_day limit 1),v_status)
        on conflict(employee_id,work_date) do update set
          status=case when public.attendance_daily.check_in_at is null then excluded.status else public.attendance_daily.status end,
          updated_at=now();
        v_leave_days:=v_leave_days+1;
      end if;
    end loop;
    if new.request_type='leave' and nullif(new.payload->>'leave_type_id','') is not null then
      v_leave_type:=(new.payload->>'leave_type_id')::uuid;
      if exists(select 1 from public.leave_types lt where lt.id=v_leave_type and lt.company_id=new.company_id) then
        insert into public.leave_balances(company_id,employee_id,leave_type_id,year,used)
        values(new.company_id,new.employee_id,v_leave_type,extract(year from v_start_date)::int,v_leave_days)
        on conflict(employee_id,leave_type_id,year) do update set used=public.leave_balances.used+excluded.used;
      end if;
    end if;

  elsif new.request_type='overtime' and v_start_date is not null then
    insert into public.overtime_records(company_id,employee_id,request_id,work_date,approved_start,approved_end,approved_minutes,status)
    values(new.company_id,new.employee_id,new.id,v_start_date,new.starts_at,new.ends_at,
      case when new.starts_at is null or new.ends_at is null then 0 else greatest(0,floor(extract(epoch from(new.ends_at-new.starts_at))/60)::int) end,'planned')
    on conflict(request_id) where request_id is not null do update set approved_start=excluded.approved_start,approved_end=excluded.approved_end,approved_minutes=excluded.approved_minutes,status='planned';

  elsif new.request_type in ('wfh','business_trip') and v_start_date is not null then
    insert into public.schedules(company_id,employee_id,work_date,work_mode,planned_location,planned_radius_m,note)
    values(new.company_id,new.employee_id,v_start_date,case when new.request_type='wfh' then 'wfh' else 'business_trip' end,
      case when new.request_type='business_trip' and new.payload ? 'latitude' and new.payload ? 'longitude'
        then extensions.st_setsrid(extensions.st_makepoint((new.payload->>'longitude')::double precision,(new.payload->>'latitude')::double precision),4326)::extensions.geography else null end,
      case when new.request_type='business_trip' then coalesce((new.payload->>'radius_m')::integer,100) else null end,new.reason)
    on conflict(employee_id,work_date) do update set work_mode=excluded.work_mode,planned_location=excluded.planned_location,planned_radius_m=excluded.planned_radius_m,note=excluded.note;

  elsif new.request_type='attendance_correction' and v_start_date is not null then
    select * into v_daily from public.attendance_daily where employee_id=new.employee_id and work_date=v_start_date;
    v_ci:=case when nullif(new.payload->>'check_in','') is null then null else (new.payload->>'check_in')::timestamptz end;
    v_co:=case when nullif(new.payload->>'check_out','') is null then null else (new.payload->>'check_out')::timestamptz end;
    if v_daily.id is not null and (v_ci is not null or v_co is not null) then
      insert into public.attendance_corrections(company_id,employee_id,attendance_daily_id,requested_by,requested_check_in,requested_check_out,reason,status,decided_at,original_snapshot,applied_snapshot)
      values(new.company_id,new.employee_id,v_daily.id,(select user_id from public.employees where id=new.employee_id),v_ci,v_co,new.reason,'approved',now(),to_jsonb(v_daily),jsonb_build_object('check_in_at',coalesce(v_ci,v_daily.check_in_at),'check_out_at',coalesce(v_co,v_daily.check_out_at)))
      returning * into v_correction;
      update public.attendance_daily set check_in_at=coalesce(v_ci,check_in_at),check_out_at=coalesce(v_co,check_out_at),corrected=true,
        worked_minutes=case when coalesce(v_ci,check_in_at) is null or coalesce(v_co,check_out_at) is null then worked_minutes else greatest(0,floor(extract(epoch from(coalesce(v_co,check_out_at)-coalesce(v_ci,check_in_at)))/60)::int-break_minutes) end,updated_at=now()
      where id=v_daily.id;
    end if;

  elsif new.request_type='shift_swap' then
    select * into v_swap from public.shift_swap_requests where request_id=new.id;
    if v_swap.id is not null and v_swap.peer_accepted_at is not null and v_swap.requester_schedule_id is not null and v_swap.target_schedule_id is not null then
      select * into v_req_schedule from public.schedules where id=v_swap.requester_schedule_id for update;
      select * into v_target_schedule from public.schedules where id=v_swap.target_schedule_id for update;
      if v_req_schedule.id is not null and v_target_schedule.id is not null and v_req_schedule.company_id=new.company_id and v_target_schedule.company_id=new.company_id then
        update public.schedules set shift_id=v_target_schedule.shift_id,work_mode=v_target_schedule.work_mode,office_id=v_target_schedule.office_id where id=v_req_schedule.id;
        update public.schedules set shift_id=v_req_schedule.shift_id,work_mode=v_req_schedule.work_mode,office_id=v_req_schedule.office_id where id=v_target_schedule.id;
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists requests_apply_approved on public.requests;
create trigger requests_apply_approved after update of status on public.requests for each row when (new.status='approved' and old.status is distinct from new.status) execute function public.apply_approved_request();
