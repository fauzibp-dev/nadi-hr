import { createClient } from "@/lib/supabase/server";
export async function GET(req:Request){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return new Response('Unauthorized',{status:401});
  const {data:p}=await supabase.from('profiles').select('company_id,role').eq('id',user.id).single(); if(!p||!['owner','hr','manager','supervisor'].includes(p.role)) return new Response('Forbidden',{status:403});
  const url=new URL(req.url); const from=url.searchParams.get('from')||new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10); const to=url.searchParams.get('to')||new Date().toISOString().slice(0,10);
  const {data,error}=await supabase.from('attendance_daily').select('work_date,status,check_in_at,check_out_at,worked_minutes,late_minutes,overtime_minutes,employees(employee_number,full_name)').eq('company_id',p.company_id).gte('work_date',from).lte('work_date',to).order('work_date'); if(error) return new Response(error.message,{status:500});
  const rows=['date,employee_number,employee_name,status,check_in,check_out,worked_minutes,late_minutes,overtime_minutes'];
  for(const r of data||[]){ const e=r.employees as unknown as {employee_number:string;full_name:string}|null; const vals=[r.work_date,e?.employee_number||'',e?.full_name||'',r.status,r.check_in_at||'',r.check_out_at||'',r.worked_minutes,r.late_minutes,r.overtime_minutes].map(v=>`"${String(v).replaceAll('"','""')}"`); rows.push(vals.join(',')); }
  return new Response(rows.join('\n'),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="attendance-${from}-${to}.csv"`}});
}
