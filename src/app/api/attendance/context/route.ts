import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(){
  if(process.env.NEXT_PUBLIC_DEMO_MODE==='true') return NextResponse.json({workMode:'office',office:{id:'demo',name:'Solo HQ',latitude:-7.5666,longitude:110.8167,radius:50,maxAccuracy:30,timezone:'Asia/Jakarta'},faceProviderRequired:false,knownDeviceRequired:false});
  try{ const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.json({error:'Unauthorized'},{status:401}); const {data,error}=await supabase.rpc('get_attendance_context'); if(error) throw error; return NextResponse.json(data); }
  catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Context failed'},{status:500});}
}
