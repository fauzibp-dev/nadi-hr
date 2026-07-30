import { createClient } from "@/lib/supabase/server";
import { activityFeed, attendanceBars, requestItems } from "@/lib/demo-data";

function localDate(timeZone:string){return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
function hhmm(value?:string|null){if(!value)return "—";return new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Jakarta"}).format(new Date(value));}

export async function getAdminDashboardData(){
  if(process.env.NEXT_PUBLIC_DEMO_MODE==="true")return {demo:true,total:112,present:103,late:8,pending:19,security:3,bars:attendanceBars,activity:activityFeed,requests:requestItems};
  const s=await createClient(); const {data:{user}}=await s.auth.getUser(); if(!user)throw new Error("Unauthorized");
  const {data:p}=await s.from("profiles").select("company_id,companies(timezone)").eq("id",user.id).single(); if(!p?.company_id)throw new Error("Company missing");
  const companyRel=p.companies as unknown as {timezone?:string}|null; const day=localDate(companyRel?.timezone||"Asia/Jakarta");
  const [emps,daily,pending,risk,events,reqs]=await Promise.all([
    s.from("employees").select("id",{count:"exact",head:true}).eq("company_id",p.company_id).is("archived_at",null),
    s.from("attendance_daily").select("status").eq("company_id",p.company_id).eq("work_date",day),
    s.from("requests").select("id",{count:"exact",head:true}).eq("company_id",p.company_id).eq("status","pending"),
    s.from("attendance_risk_flags").select("id",{count:"exact",head:true}).eq("company_id",p.company_id).is("resolved_at",null),
    s.from("attendance_events").select("event_time,event_type,decision,distance_m,employees(full_name)").eq("company_id",p.company_id).order("event_time",{ascending:false}).limit(8),
    s.from("requests").select("id,request_type,work_date,reason,employees(full_name)").eq("company_id",p.company_id).eq("status","pending").order("created_at",{ascending:false}).limit(3)
  ]);
  const rows=daily.data||[]; const present=rows.filter(x=>["present","late"].includes(x.status)).length; const late=rows.filter(x=>x.status==="late").length;
  return {demo:false,total:emps.count||0,present,late,pending:pending.count||0,security:risk.count||0,bars:attendanceBars,
    activity:(events.data||[]).map((x,index)=>{const e=x.employees as unknown as {full_name?:string}|null;return {time:hhmm(x.event_time),title:`${e?.full_name||"Employee"} · ${String(x.event_type).replaceAll("_"," ")}`,meta:x.distance_m!=null?`${Math.round(x.distance_m)}m dari titik`:x.decision,tone:x.decision==="accepted"?"success":x.decision==="review"?"danger":"warning",key:index};}),
    requests:(reqs.data||[]).map((x,index)=>{const e=x.employees as unknown as {full_name?:string}|null;const name=e?.full_name||"Employee";return {name,type:String(x.request_type).replaceAll("_"," "),date:x.work_date||"—",reason:x.reason||"Tanpa catatan",avatar:name.split(/\s+/).map(v=>v[0]).join("").slice(0,2).toUpperCase(),key:index};})};
}

export async function getEmployeeDashboardData(){
  if(process.env.NEXT_PUBLIC_DEMO_MODE==="true")return {demo:true,name:"Andi",shift:"Regular · 08:00–17:00",checkIn:"07:52",checkOut:null,status:"present",late:0,pending:2,announcement:"Town hall Agustus"};
  const s=await createClient(); const {data:{user}}=await s.auth.getUser();if(!user)throw new Error("Unauthorized");
  const {data:p}=await s.from("profiles").select("employee_id,full_name,company_id,companies(timezone)").eq("id",user.id).single();if(!p?.employee_id)throw new Error("Employee missing");
  const companyRel=p.companies as unknown as {timezone?:string}|null;const day=localDate(companyRel?.timezone||"Asia/Jakarta");
  const [schedule,daily,pending,ann]=await Promise.all([
    s.from("schedules").select("work_mode,shift_id,shifts(name,start_time,end_time),offices(name)").eq("employee_id",p.employee_id).eq("work_date",day).maybeSingle(),
    s.from("attendance_daily").select("check_in_at,check_out_at,status,late_minutes,worked_minutes").eq("employee_id",p.employee_id).eq("work_date",day).maybeSingle(),
    s.from("requests").select("id",{count:"exact",head:true}).eq("employee_id",p.employee_id).eq("status","pending"),
    s.from("announcements").select("title").or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`).order("created_at",{ascending:false}).limit(1).maybeSingle()
  ]);
  const sh=schedule.data?.shifts as unknown as {name?:string;start_time?:string;end_time?:string}|null;
  return {demo:false,name:(p.full_name||"Employee").split(" ")[0],shift:sh?`${sh.name} · ${(sh.start_time||"").slice(0,5)}–${(sh.end_time||"").slice(0,5)}`:(schedule.data?.work_mode||"Belum dijadwalkan"),checkIn:hhmm(daily.data?.check_in_at),checkOut:daily.data?.check_out_at?hhmm(daily.data.check_out_at):null,status:daily.data?.status||"scheduled",late:daily.data?.late_minutes||0,pending:pending.count||0,announcement:ann.data?.title||null};
}

export async function getPlatformDashboardData(){
  if(process.env.NEXT_PUBLIC_DEMO_MODE==="true")return {demo:true,companies:12,employees:428,events:731,trials:3,active:9,pastDue:1};
  const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)throw new Error("Unauthorized");
  const [companies,employees,events,subs]=await Promise.all([
    s.from("companies").select("id",{count:"exact",head:true}),
    s.from("employees").select("id",{count:"exact",head:true}).is("archived_at",null),
    s.from("attendance_events").select("id",{count:"exact",head:true}).gte("event_time",new Date(Date.now()-86400000).toISOString()),
    s.from("subscriptions").select("status")
  ]);
  const statuses=subs.data||[];return {demo:false,companies:companies.count||0,employees:employees.count||0,events:events.count||0,trials:statuses.filter(x=>x.status==="trial").length,active:statuses.filter(x=>x.status==="active").length,pastDue:statuses.filter(x=>x.status==="past_due").length};
}
