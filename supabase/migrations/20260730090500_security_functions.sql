-- Audit helper for privileged modifications.
create or replace function public.audit_row_change() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare cid uuid; eid text; before_json jsonb; after_json jsonb; begin
  if tg_op='DELETE' then
    cid:=old.company_id; eid:=old.id::text; before_json:=to_jsonb(old); after_json:=null;
  elsif tg_op='INSERT' then
    cid:=new.company_id; eid:=new.id::text; before_json:=null; after_json:=to_jsonb(new);
  else
    cid:=new.company_id; eid:=new.id::text; before_json:=to_jsonb(old); after_json:=to_jsonb(new);
  end if;
  insert into public.audit_logs(company_id,actor_user_id,actor_role,action,entity_type,entity_id,before_data,after_data)
  values(cid,auth.uid(),app.current_role()::text,tg_op||'.'||tg_table_name,tg_table_name,eid,before_json,after_json);
  if tg_op='DELETE' then return old; else return new; end if;
end $$;

do $$ declare t text; begin
  foreach t in array array['employees','offices','shifts','schedules','requests','attendance_corrections','subscriptions'] loop
    execute format('drop trigger if exists audit_%I on public.%I',t,t);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',t,t);
  end loop;
end $$;

-- Mark suspicious travel after a new attendance event. This is a review signal, not an automatic disciplinary decision.
create or replace function public.flag_attendance_anomalies() returns trigger language plpgsql security definer set search_path=public,extensions as $$
declare prev public.attendance_events%rowtype; km double precision; minutes double precision; begin
  select * into prev from public.attendance_events where employee_id=new.employee_id and id<>new.id and event_time<new.event_time and location is not null order by event_time desc limit 1;
  if prev.id is not null and new.location is not null then
    km:=extensions.st_distance(prev.location,new.location)/1000.0; minutes:=extract(epoch from(new.event_time-prev.event_time))/60.0;
    if minutes>0 and km>30 and (km/(minutes/60.0))>300 then
      insert into public.attendance_risk_flags(company_id,attendance_event_id,employee_id,flag_key,severity,description)
      values(new.company_id,new.id,new.employee_id,'impossible_travel','high',format('Perpindahan %s km dalam %s menit memerlukan review.',round(km::numeric,1),round(minutes::numeric,0)));
      update public.attendance_events set decision='review',risk_flags=array_append(risk_flags,'impossible_travel'),risk_score=greatest(0,risk_score-25) where id=new.id;
    end if;
  end if;
  return new;
end $$;
create trigger attendance_anomaly_after_insert after insert on public.attendance_events for each row execute function public.flag_attendance_anomalies();

-- Convenience function for platform admin to attach an Auth user as first workspace owner.
create or replace function public.platform_attach_user(p_user_id uuid,p_company_id uuid,p_role public.app_role,p_employee_id uuid default null)
returns void language plpgsql security definer set search_path=public,auth as $$ begin
  if not app.is_platform_admin() then raise exception 'PLATFORM_ADMIN_REQUIRED'; end if;
  update public.profiles set company_id=p_company_id,role=p_role,employee_id=p_employee_id,is_active=true where id=p_user_id;
  if p_employee_id is not null then update public.employees set user_id=p_user_id where id=p_employee_id and company_id=p_company_id; end if;
end $$;
revoke all on function public.platform_attach_user(uuid,uuid,public.app_role,uuid) from public;
grant execute on function public.platform_attach_user(uuid,uuid,public.app_role,uuid) to authenticated;
