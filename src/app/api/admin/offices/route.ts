import { NextResponse } from "next/server";
import { requireApiProfile } from "@/lib/api-auth";
const ADMIN=["owner","hr"] as const;
export async function GET(){
  const ctx=await requireApiProfile(["owner","hr","manager","supervisor"]); if("error" in ctx)return NextResponse.json({error:ctx.error},{status:ctx.status});
  const {data,error}=await ctx.supabase.from("offices").select("id,name,address,radius_m,max_accuracy_m,timezone,is_active,branch_id").order("name");
  return error?NextResponse.json({error:error.message},{status:400}):NextResponse.json({items:data});
}
export async function POST(req:Request){
  const ctx=await requireApiProfile([...ADMIN]); if("error" in ctx)return NextResponse.json({error:ctx.error},{status:ctx.status});
  const b=await req.json(); const nums=[b.latitude,b.longitude,b.radius,b.maxAccuracy].map(Number);
  if(!b.name||nums.some(Number.isNaN))return NextResponse.json({error:"Nama dan policy lokasi wajib diisi"},{status:400});
  const {data,error}=await ctx.supabase.rpc("upsert_office",{p_id:b.id||null,p_name:b.name,p_address:b.address||"",p_latitude:nums[0],p_longitude:nums[1],p_radius_m:nums[2],p_max_accuracy_m:nums[3],p_timezone:b.timezone||"Asia/Jakarta",p_branch_id:b.branchId||null});
  return error?NextResponse.json({error:error.message},{status:422}):NextResponse.json({ok:true,id:data});
}
