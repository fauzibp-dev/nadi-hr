-- Optional demo business data. Does not create Auth users.
insert into public.plans(code,name,price_monthly_idr,employee_limit,office_limit,trial_days,features) values
('starter','Starter',450000,25,1,14,'{"geofence":true,"face_evidence":true,"leave":true,"reports":true}'::jsonb),
('business','Business',900000,150,5,14,'{"geofence":true,"face_evidence":true,"device_trust":true,"overtime":true,"wfh":true,"field_work":true,"shift_swap":true,"payroll_export":true,"api_webhook":true}'::jsonb),
('enterprise','Enterprise',null,null,null,30,'{"all":true}'::jsonb)
on conflict(code) do nothing;

with c as (
  insert into public.companies(name,slug) values('PT Ruang Tumbuh','ruang-tumbuh')
  on conflict(slug) do update set name=excluded.name returning id
), b as (
  insert into public.branches(company_id,name,code) select id,'Solo HQ','SOLO' from c
  on conflict(company_id,code) do update set name=excluded.name returning id,company_id
), o as (
  insert into public.offices(company_id,branch_id,name,address,location,radius_m,max_accuracy_m)
  select b.company_id,b.id,'Solo HQ','Surakarta',extensions.st_setsrid(extensions.st_makepoint(110.8167,-7.5666),4326)::extensions.geography,50,30 from b
  on conflict(company_id,name) do update set branch_id=excluded.branch_id,address=excluded.address,location=excluded.location,radius_m=excluded.radius_m,max_accuracy_m=excluded.max_accuracy_m
  returning company_id,id
), sh as (
  insert into public.shifts(company_id,name,code,start_time,end_time,grace_minutes,early_checkin_minutes)
  select company_id,'Regular','REG','08:00','17:00',10,30 from o
  on conflict(company_id,code) do update set name=excluded.name,start_time=excluded.start_time,end_time=excluded.end_time,grace_minutes=excluded.grace_minutes,early_checkin_minutes=excluded.early_checkin_minutes
  returning company_id,id
)
insert into public.leave_types(company_id,name,code,annual_quota,paid)
select company_id,'Cuti Tahunan','ANNUAL',12,true from sh on conflict(company_id,code) do nothing;

insert into public.subscriptions(company_id,plan_id,status,trial_ends_at,current_period_end)
select c.id,p.id,'trial',now()+interval '14 days',now()+interval '1 month' from public.companies c join public.plans p on p.code='business' where c.slug='ruang-tumbuh'
on conflict(company_id) do nothing;
