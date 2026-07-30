import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const actions=["Kedipkan mata sekali","Hadapkan wajah sedikit ke kanan","Hadapkan wajah sedikit ke kiri","Tatap kamera selama 2 detik"];
export async function POST(){
  try{
    const token=randomBytes(32).toString('base64url'); const challenge=actions[Math.floor(Math.random()*actions.length)];
    if(process.env.NEXT_PUBLIC_DEMO_MODE==='true') return NextResponse.json({token,challenge,expiresIn:90});
    const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.json({error:'Unauthorized'},{status:401});
    const {data:p}=await supabase.from('profiles').select('company_id,employee_id').eq('id',user.id).single(); if(!p?.employee_id) return NextResponse.json({error:'Employee profile missing'},{status:403});
    const hash=createHash('sha256').update(token).digest('hex'); const admin=createAdminClient(); const {error}=await admin.from('attendance_challenges').insert({company_id:p.company_id,employee_id:p.employee_id,nonce_hash:hash,challenge,expires_at:new Date(Date.now()+90000).toISOString()}); if(error) throw error;
    return NextResponse.json({token,challenge,expiresIn:90});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Challenge failed'},{status:500});}
}
