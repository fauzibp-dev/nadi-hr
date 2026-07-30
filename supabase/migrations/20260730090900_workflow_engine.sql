alter table public.requests add column if not exists workflow_id uuid references public.approval_workflows(id) on delete set null;

create or replace function public.assign_request_workflow() returns trigger
language plpgsql security definer set search_path=public,auth as $$
declare v_emp public.employees%rowtype;
begin
  if new.workflow_id is not null then return new; end if;
  select * into v_emp from public.employees where id=new.employee_id and company_id=new.company_id;
  select w.id into new.workflow_id
  from public.approval_workflows w
  where w.company_id=new.company_id and w.request_type=new.request_type and w.is_active
    and (w.branch_id is null or w.branch_id=v_emp.branch_id)
    and (w.department_id is null or w.department_id=v_emp.department_id)
  order by (w.department_id is not null)::int desc,(w.branch_id is not null)::int desc,w.is_default desc
  limit 1;
  new.current_step:=1;
  return new;
end $$;
drop trigger if exists requests_assign_workflow on public.requests;
create trigger requests_assign_workflow before insert on public.requests for each row execute function public.assign_request_workflow();

create or replace function public.decide_request(p_request_id uuid,p_decision text,p_note text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  v_uid uuid:=auth.uid(); v_profile public.profiles%rowtype; v_request public.requests%rowtype; v_step public.approval_workflow_steps%rowtype;
  v_target public.employees%rowtype; v_actor_employee uuid; v_allowed boolean:=false; v_next integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'INVALID_DECISION'; end if;
  select * into v_profile from public.profiles where id=v_uid and is_active;
  if v_profile.id is null or v_profile.role not in ('owner','hr','manager','supervisor') then raise exception 'FORBIDDEN'; end if;
  select * into v_request from public.requests where id=p_request_id for update;
  if v_request.id is null or v_request.company_id<>v_profile.company_id then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request.status<>'pending' then raise exception 'REQUEST_NOT_PENDING'; end if;
  select * into v_target from public.employees where id=v_request.employee_id;
  v_actor_employee:=v_profile.employee_id;

  if v_request.workflow_id is null then
    v_allowed := v_profile.role in ('owner','hr') or (v_profile.role in ('manager','supervisor') and v_target.manager_id=v_actor_employee);
  else
    select * into v_step from public.approval_workflow_steps where workflow_id=v_request.workflow_id and step_no=v_request.current_step;
    if v_step.id is null then raise exception 'WORKFLOW_STEP_MISSING'; end if;
    v_allowed := case v_step.approver_type
      when 'specific_user' then v_step.approver_user_id=v_uid
      when 'owner' then v_profile.role='owner'
      when 'hr' then v_profile.role in ('owner','hr')
      when 'manager' then (v_profile.role in ('owner','hr') or (v_profile.role='manager' and v_target.manager_id=v_actor_employee))
      when 'supervisor' then (v_profile.role in ('owner','hr') or (v_profile.role='supervisor' and v_target.manager_id=v_actor_employee))
      else false end;
  end if;
  if not v_allowed then raise exception 'NOT_CURRENT_APPROVER'; end if;

  insert into public.request_approvals(company_id,request_id,step_no,approver_user_id,decision,note,decided_at)
  values(v_request.company_id,v_request.id,v_request.current_step,v_uid,p_decision,left(coalesce(p_note,''),1000),now())
  on conflict(request_id,step_no) do update set approver_user_id=excluded.approver_user_id,decision=excluded.decision,note=excluded.note,decided_at=excluded.decided_at;

  if p_decision='rejected' then
    update public.requests set status='rejected',decided_at=now() where id=v_request.id;
    return jsonb_build_object('ok',true,'status','rejected','current_step',v_request.current_step);
  end if;

  if v_request.workflow_id is null then
    update public.requests set status='approved',decided_at=now() where id=v_request.id;
    return jsonb_build_object('ok',true,'status','approved','current_step',v_request.current_step);
  end if;
  select min(step_no) into v_next from public.approval_workflow_steps where workflow_id=v_request.workflow_id and step_no>v_request.current_step and required;
  if v_next is null then
    update public.requests set status='approved',decided_at=now() where id=v_request.id;
    return jsonb_build_object('ok',true,'status','approved','current_step',v_request.current_step);
  end if;
  update public.requests set current_step=v_next where id=v_request.id;
  return jsonb_build_object('ok',true,'status','pending','current_step',v_next);
end $$;
revoke all on function public.decide_request(uuid,text,text) from public;
grant execute on function public.decide_request(uuid,text,text) to authenticated;
