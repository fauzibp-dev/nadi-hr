create type public.attendance_event_type as enum ('check_in','break_start','break_end','check_out','overtime_start','overtime_end','wfh_start','wfh_end','field_start','field_end');
create type public.attendance_decision as enum ('accepted','review','rejected');

create table public.attendance_challenges (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  nonce_hash text not null unique, challenge text not null, expires_at timestamptz not null, used_at timestamptz, created_at timestamptz not null default now()
);

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, schedule_id uuid references public.schedules(id) on delete set null,
  office_id uuid references public.offices(id) on delete set null, event_type public.attendance_event_type not null,
  event_time timestamptz not null default now(), location extensions.geography(point,4326), latitude double precision, longitude double precision,
  accuracy_m double precision, distance_m double precision, evidence_path text,
  face_status text, face_score double precision, liveness_status text, device_id uuid references public.employee_devices(id) on delete set null,
  device_hint text, ip inet, decision public.attendance_decision not null default 'accepted', risk_score integer not null default 0,
  risk_flags text[] not null default '{}', source text not null default 'web', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index attendance_events_employee_time_idx on public.attendance_events(employee_id,event_time desc);
create index attendance_events_company_time_idx on public.attendance_events(company_id,event_time desc);
create index attendance_events_location_gix on public.attendance_events using gist(location);

create table public.attendance_daily (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, work_date date not null, schedule_id uuid references public.schedules(id) on delete set null,
  check_in_at timestamptz, check_out_at timestamptz, worked_minutes integer not null default 0, break_minutes integer not null default 0,
  overtime_minutes integer not null default 0, late_minutes integer not null default 0, early_leave_minutes integer not null default 0,
  status text not null default 'scheduled' check(status in ('scheduled','present','late','leave','sick','permission','absent','off','review')),
  corrected boolean not null default false, updated_at timestamptz not null default now(), unique(employee_id,work_date)
);

create table public.attendance_corrections (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, attendance_daily_id uuid references public.attendance_daily(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null, requested_check_in timestamptz, requested_check_out timestamptz, reason text not null,
  status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')), decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz, original_snapshot jsonb, applied_snapshot jsonb, created_at timestamptz not null default now()
);

create table public.attendance_risk_flags (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  attendance_event_id uuid not null references public.attendance_events(id) on delete cascade, employee_id uuid not null references public.employees(id) on delete cascade,
  flag_key text not null, severity text not null check(severity in ('low','medium','high')), description text, status text not null default 'open' check(status in ('open','reviewed','dismissed','confirmed')),
  reviewed_by uuid references auth.users(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now()
);

create or replace function public.submit_attendance_event(
  p_user_id uuid, p_event_type text, p_latitude double precision, p_longitude double precision, p_accuracy double precision,
  p_evidence_path text default null, p_face_status text default null, p_face_score double precision default null,
  p_liveness_status text default null, p_device_hint text default null, p_ip text default null, p_device_id uuid default null, p_device_verified boolean default false
) returns jsonb
language plpgsql security definer set search_path=public,auth,extensions as $$
declare
  v_uid uuid:=p_user_id; v_emp public.employees%rowtype; v_company public.companies%rowtype;
  v_point extensions.geography(point,4326); v_office public.offices%rowtype; v_distance double precision;
  v_schedule public.schedules%rowtype; v_shift public.shifts%rowtype; v_now timestamptz:=now(); v_work_date date; v_local_time time; v_shift_start timestamptz;
  v_last public.attendance_events%rowtype; v_late integer:=0; v_risk integer:=15; v_flags text[]:='{}'; v_decision public.attendance_decision:='accepted';
  v_require_face boolean; v_require_device boolean;
begin
  if v_uid is null then raise exception 'USER_REQUIRED'; end if;
  select * into v_emp from public.employees where user_id=v_uid and archived_at is null limit 1;
  if v_emp.id is null then raise exception 'EMPLOYEE_NOT_LINKED'; end if;
  select * into v_company from public.companies where id=v_emp.company_id;
  if v_company.status<>'active' then raise exception 'COMPANY_NOT_ACTIVE'; end if;
  if p_event_type not in ('check_in','break_start','break_end','check_out','overtime_start','overtime_end','wfh_start','wfh_end','field_start','field_end') then raise exception 'INVALID_EVENT_TYPE'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 or p_accuracy<=0 then raise exception 'INVALID_LOCATION'; end if;
  v_point:=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography;
  v_work_date := (v_now at time zone v_company.timezone)::date;
  v_local_time := (v_now at time zone v_company.timezone)::time;
  select s.* into v_schedule
  from public.schedules s left join public.shifts sh on sh.id=s.shift_id
  where s.employee_id=v_emp.id and (
    s.work_date=v_work_date or
    (s.work_date=v_work_date-1 and sh.end_time<=sh.start_time and v_local_time<=sh.end_time)
  ) order by s.work_date desc limit 1;
  if v_schedule.id is not null then v_work_date:=v_schedule.work_date; end if;
  if v_schedule.id is not null and v_schedule.shift_id is not null then select * into v_shift from public.shifts where id=v_schedule.shift_id; end if;
  if v_schedule.id is not null and v_schedule.work_mode='off' then raise exception 'NO_WORK_SCHEDULED'; end if;

  -- Pick the closest eligible office. WFH/field can use planned location instead of office.
  if v_schedule.work_mode in ('wfh') then
    v_distance:=0; v_risk:=v_risk+25;
  elsif v_schedule.work_mode in ('field','business_trip') and v_schedule.planned_location is not null then
    v_distance:=extensions.st_distance(v_point,v_schedule.planned_location);
    if v_distance>coalesce(v_schedule.planned_radius_m,100) then raise exception 'OUTSIDE_ASSIGNED_LOCATION'; end if;
    v_risk:=v_risk+30;
  else
    select o.* into v_office
    from public.offices o
    join public.employee_offices eo on eo.office_id=o.id and eo.employee_id=v_emp.id
    where o.is_active and (eo.valid_from is null or eo.valid_from<=v_work_date) and (eo.valid_until is null or eo.valid_until>=v_work_date)
    order by extensions.st_distance(v_point,o.location) asc limit 1;
    if v_office.id is null then raise exception 'NO_ELIGIBLE_OFFICE'; end if;
    v_distance:=extensions.st_distance(v_point,v_office.location);
    if p_accuracy>v_office.max_accuracy_m then raise exception 'GPS_ACCURACY_TOO_LOW'; end if;
    if v_distance>v_office.radius_m then raise exception 'OUTSIDE_GEOFENCE'; end if;
    v_risk:=v_risk+35;
    if v_distance>v_office.radius_m*.9 then v_flags:=array_append(v_flags,'near_geofence_edge'); end if;
    if p_accuracy>v_office.max_accuracy_m*.8 then v_flags:=array_append(v_flags,'gps_accuracy_near_limit'); end if;
  end if;

  select * into v_last from public.attendance_events where employee_id=v_emp.id order by event_time desc limit 1;
  if v_last.id is not null and extract(epoch from (v_now-v_last.event_time)) < coalesce((v_company.attendance_policy->>'duplicate_window_s')::integer,30) then raise exception 'DUPLICATE_WINDOW'; end if;

  v_require_face:=coalesce((v_company.attendance_policy->>'require_face_provider')::boolean,false);
  v_require_device:=coalesce((v_company.attendance_policy->>'require_known_device')::boolean,false);
  if v_require_face and coalesce(p_face_status,'')<>'verified' then raise exception 'FACE_VERIFICATION_REQUIRED'; end if;
  if p_face_status='verified' then v_risk:=v_risk+35; elsif p_evidence_path is not null then v_risk:=v_risk+15; v_flags:=array_append(v_flags,'face_evidence_unverified'); else v_flags:=array_append(v_flags,'no_face_evidence'); end if;
  if p_liveness_status='verified' then v_risk:=v_risk+15; elsif p_liveness_status is not null then v_risk:=v_risk+5; end if;
  if p_device_verified then v_risk:=v_risk+15; elsif v_require_device then raise exception 'KNOWN_DEVICE_REQUIRED'; else v_flags:=array_append(v_flags,'untrusted_device'); end if;

  if p_event_type='check_in' and v_shift.id is not null then
    v_shift_start:=((v_work_date::text||' '||v_shift.start_time::text)::timestamp at time zone v_company.timezone);
    if v_now < v_shift_start - make_interval(mins=>v_shift.early_checkin_minutes) then raise exception 'CHECKIN_NOT_OPEN'; end if;
    v_late:=greatest(0, floor(extract(epoch from (v_now-v_shift_start))/60)::integer-v_shift.grace_minutes);
  end if;
  v_risk:=least(100,v_risk+15);
  -- Evidence-only mode remains an honest risk flag, not a fake biometric verification.

  insert into public.attendance_events(company_id,employee_id,schedule_id,office_id,event_type,event_time,location,latitude,longitude,accuracy_m,distance_m,evidence_path,face_status,face_score,liveness_status,device_id,device_hint,ip,decision,risk_score,risk_flags)
  values(v_emp.company_id,v_emp.id,v_schedule.id,v_office.id,p_event_type::public.attendance_event_type,v_now,v_point,p_latitude,p_longitude,p_accuracy,v_distance,p_evidence_path,p_face_status,p_face_score,p_liveness_status,p_device_id,p_device_hint,case when p_ip is null or p_ip='' then null else p_ip::inet end,v_decision,v_risk,v_flags);

  if p_event_type='check_in' then
    insert into public.attendance_daily(company_id,employee_id,work_date,schedule_id,check_in_at,late_minutes,status)
    values(v_emp.company_id,v_emp.id,v_work_date,v_schedule.id,v_now,v_late,case when v_decision='review' then 'review' when v_late>0 then 'late' else 'present' end)
    on conflict(employee_id,work_date) do update set check_in_at=coalesce(public.attendance_daily.check_in_at,excluded.check_in_at),late_minutes=excluded.late_minutes,status=excluded.status,updated_at=now();
  elsif p_event_type='check_out' then
    insert into public.attendance_daily(company_id,employee_id,work_date,schedule_id,check_out_at,status)
    values(v_emp.company_id,v_emp.id,v_work_date,v_schedule.id,v_now,case when v_decision='review' then 'review' else 'present' end)
    on conflict(employee_id,work_date) do update set check_out_at=excluded.check_out_at, worked_minutes=case when public.attendance_daily.check_in_at is null then 0 else greatest(0,floor(extract(epoch from (excluded.check_out_at-public.attendance_daily.check_in_at))/60)::int-public.attendance_daily.break_minutes) end, updated_at=now();
  end if;
  return jsonb_build_object('ok',true,'message',case when v_decision='review' then 'Absensi tercatat dan menunggu review evidence.' else 'Absensi valid dan berhasil dicatat.' end,'decision',v_decision,'distance_m',round(v_distance::numeric,1),'risk_score',v_risk,'flags',v_flags,'server_time',v_now);
end $$;
revoke all on function public.submit_attendance_event(uuid,text,double precision,double precision,double precision,text,text,double precision,text,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.submit_attendance_event(uuid,text,double precision,double precision,double precision,text,text,double precision,text,text,text,uuid,boolean) to service_role;
