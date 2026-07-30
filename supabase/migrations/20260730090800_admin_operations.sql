-- Safe coordinate -> PostGIS office mutation for tenant HR/owner.
create or replace function public.upsert_office(
  p_id uuid, p_name text, p_address text, p_latitude double precision, p_longitude double precision,
  p_radius_m integer default 50, p_max_accuracy_m integer default 30, p_timezone text default 'Asia/Jakarta', p_branch_id uuid default null
) returns uuid
language plpgsql security definer set search_path=public,auth,extensions as $$
declare v_company uuid:=app.current_company_id(); v_id uuid; v_office_limit integer;
begin
  if auth.uid() is null or not app.is_hr_admin() then raise exception 'FORBIDDEN'; end if;
  if v_company is null then raise exception 'COMPANY_REQUIRED'; end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then raise exception 'INVALID_COORDINATE'; end if;
  if p_radius_m not between 10 and 10000 or p_max_accuracy_m not between 5 and 500 then raise exception 'INVALID_LOCATION_POLICY'; end if;
  if p_branch_id is not null and not exists(select 1 from public.branches b where b.id=p_branch_id and b.company_id=v_company) then raise exception 'INVALID_BRANCH'; end if;
  if p_id is null then
    select pl.office_limit into v_office_limit from public.subscriptions sub join public.plans pl on pl.id=sub.plan_id where sub.company_id=v_company and sub.status in ('trial','active','past_due');
    if v_office_limit is not null and (select count(*) from public.offices o where o.company_id=v_company and o.is_active)>=v_office_limit then raise exception 'OFFICE_LIMIT_REACHED'; end if;
    insert into public.offices(company_id,branch_id,name,address,location,radius_m,max_accuracy_m,timezone)
    values(v_company,p_branch_id,trim(p_name),nullif(trim(p_address),''),extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,p_radius_m,p_max_accuracy_m,p_timezone)
    returning id into v_id;
  else
    update public.offices set branch_id=p_branch_id,name=trim(p_name),address=nullif(trim(p_address),''),location=extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,radius_m=p_radius_m,max_accuracy_m=p_max_accuracy_m,timezone=p_timezone
    where id=p_id and company_id=v_company returning id into v_id;
    if v_id is null then raise exception 'OFFICE_NOT_FOUND'; end if;
  end if;
  return v_id;
end $$;
revoke all on function public.upsert_office(uuid,text,text,double precision,double precision,integer,integer,text,uuid) from public;
grant execute on function public.upsert_office(uuid,text,text,double precision,double precision,integer,integer,text,uuid) to authenticated;
