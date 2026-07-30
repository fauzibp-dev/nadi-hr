import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowed = new Set(["leave","sick","permission","overtime","attendance_correction","wfh","business_trip","shift_swap"]);
export async function POST(req:Request){
  try{
    const body=await req.json(); if(!allowed.has(body.requestType)) return NextResponse.json({error:"Jenis pengajuan tidak valid"},{status:400});
    const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.json({error:"Unauthorized"},{status:401});
    const {data:profile}=await supabase.from("profiles").select("company_id,employee_id").eq("id",user.id).single(); if(!profile?.employee_id) return NextResponse.json({error:"Employee profile missing"},{status:403});
    const {data,error}=await supabase.from("requests").insert({company_id:profile.company_id,employee_id:profile.employee_id,request_type:body.requestType,starts_at:body.startsAt||null,ends_at:body.endsAt||null,work_date:body.workDate||null,reason:String(body.reason||"").slice(0,2000),payload:body.payload||{}}).select("id,status").single();
    if(error) throw error; return NextResponse.json({ok:true,request:data});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Request failed"},{status:500});}
}

export async function GET(){
  try{
    const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
    const {data:profile}=await supabase.from("profiles").select("employee_id").eq("id",user.id).single(); if(!profile?.employee_id)return NextResponse.json({error:"Employee profile missing"},{status:403});
    const {data,error}=await supabase.from("requests").select("id,request_type,status,starts_at,ends_at,work_date,reason,payload,created_at").eq("employee_id",profile.employee_id).order("created_at",{ascending:false}).limit(100);
    if(error)throw error; return NextResponse.json({items:data});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Request list failed"},{status:500});}
}
