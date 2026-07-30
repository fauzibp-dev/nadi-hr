import { Avatar, Badge } from "@/components/ui";
import { demoEmployees } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

type Row={name:string;role:string;dept:string;office:string;status:string;time:string;avatar:string};
function initials(name:string){return name.split(/\s+/).filter(Boolean).map(v=>v[0]).join("").slice(0,2).toUpperCase()||"?";}
function time(value:string|null){if(!value)return "—";return new Intl.DateTimeFormat("id-ID",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Jakarta"}).format(new Date(value));}
async function rows():Promise<Row[]>{
  if(process.env.NEXT_PUBLIC_DEMO_MODE==="true")return demoEmployees;
  const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return [];
  const {data:p}=await s.from("profiles").select("company_id,companies(timezone)").eq("id",user.id).single();if(!p?.company_id)return [];
  const companyRel=p.companies as unknown as {timezone?:string}|null;const day=new Intl.DateTimeFormat("en-CA",{timeZone:companyRel?.timezone||"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const {data:people}=await s.from("employees").select("id,full_name,job_title,employment_status,departments(name),branches(name)").eq("company_id",p.company_id).is("archived_at",null).order("full_name").limit(100);
  const ids=(people||[]).map(x=>x.id);const {data:daily}=ids.length?await s.from("attendance_daily").select("employee_id,check_in_at,status,late_minutes").in("employee_id",ids).eq("work_date",day):{data:[]};type Daily={employee_id:string;check_in_at:string|null;status:string;late_minutes:number};const by=new Map<string,Daily>(((daily||[]) as Daily[]).map(x=>[x.employee_id,x]));
  return (people||[]).map(e=>{const a=by.get(e.id);const dep=e.departments as unknown as {name?:string}|null;const branch=e.branches as unknown as {name?:string}|null;const label=a?.status==="late"?`Late ${a.late_minutes||0}m`:a?.status?String(a.status).replaceAll("_"," "):"Not in";return {name:e.full_name,role:e.job_title||String(e.employment_status),dept:dep?.name||"—",office:branch?.name||"—",status:label,time:time(a?.check_in_at||null),avatar:initials(e.full_name)};});
}
export async function EmployeeTable(){const data=await rows();return <div className="tablewrap"><table><thead><tr><th>Karyawan</th><th>Divisi</th><th>Cabang</th><th>Masuk</th><th>Status</th><th></th></tr></thead><tbody>{data.length?data.map(e=><tr key={e.name}><td><div className="person"><Avatar label={e.avatar}/><div className="meta"><strong>{e.name}</strong><span>{e.role}</span></div></div></td><td>{e.dept}</td><td>{e.office}</td><td>{e.time}</td><td><Badge tone={e.status.toLowerCase().includes("present")||e.status.includes("On")?"success":e.status.toLowerCase().includes("late")?"warning":e.status.toLowerCase().includes("review")?"danger":"info"}>{e.status}</Badge></td><td style={{textAlign:"right"}}>•••</td></tr>):<tr><td colSpan={6}><div className="empty">Belum ada karyawan.</div></td></tr>}</tbody></table></div>}
