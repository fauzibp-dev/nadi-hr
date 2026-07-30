-- Run AFTER seed.sql if you want a database employee row for an existing Auth user.
-- Replace YOUR_AUTH_USER_ID.
do $$
declare cid uuid; bid uuid; oid uuid; sid uuid; eid uuid;
begin
  select id into cid from public.companies where slug='ruang-tumbuh';
  select id into bid from public.branches where company_id=cid and code='SOLO';
  select id into oid from public.offices where company_id=cid and name='Solo HQ';
  select id into sid from public.shifts where company_id=cid and code='REG';
  insert into public.employees(company_id,user_id,employee_number,full_name,email,branch_id,job_title,employment_status,joined_at)
  values(cid,'YOUR_AUTH_USER_ID'::uuid,'EMP-0012','Andi Pratama','andi@example.com',bid,'Sales Executive','permanent',current_date)
  returning id into eid;
  update public.profiles set company_id=cid,employee_id=eid,role='employee',full_name='Andi Pratama' where id='YOUR_AUTH_USER_ID'::uuid;
  insert into public.employee_offices(company_id,employee_id,office_id) values(cid,eid,oid);
  insert into public.schedules(company_id,employee_id,shift_id,work_date,work_mode,office_id)
  values(cid,eid,sid,current_date,'office',oid) on conflict(employee_id,work_date) do nothing;
end $$;
