-- 1) Create your first user in Supabase Auth Dashboard (Authentication > Users).
-- 2) Replace email below, then run this file in SQL Editor.
-- This is the only bootstrap step that intentionally bypasses the app UI.
update public.profiles
set role='platform_admin', is_active=true, full_name=coalesce(nullif(full_name,''),'Platform Admin')
where email='YOUR_EMAIL@example.com';

select id,email,role from public.profiles where email='YOUR_EMAIL@example.com';
