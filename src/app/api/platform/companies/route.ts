import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req:Request){
  let companyId:string|undefined;
  try{
    const body=await req.json();
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
    const {data:p}=await supabase.from("profiles").select("role").eq("id",user.id).single();
    if(p?.role!=="platform_admin")return NextResponse.json({error:"Platform admin required"},{status:403});

    const name=String(body.name||"").trim();
    const slug=String(body.slug||"").trim().toLowerCase().replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
    if(name.length<2||slug.length<2)return NextResponse.json({error:"Name/slug invalid"},{status:400});
    const admin=createAdminClient();
    const {data:plan,error:planError}=await admin.from("plans").select("id,trial_days").eq("code",body.plan||"starter").single();
    if(planError||!plan)return NextResponse.json({error:"Plan tidak ditemukan"},{status:400});

    const {data:c,error}=await admin.from("companies").insert({name,slug,timezone:body.timezone||"Asia/Jakarta"}).select().single();
    if(error)throw error; companyId=c.id;
    const now=Date.now();
    const {error:subError}=await admin.from("subscriptions").insert({company_id:c.id,plan_id:plan.id,status:"trial",trial_ends_at:new Date(now+plan.trial_days*86400000).toISOString(),current_period_end:new Date(now+30*86400000).toISOString()});
    if(subError)throw subError;
    return NextResponse.json({ok:true,id:c.id,company:c});
  }catch(e){
    if(companyId){try{await createAdminClient().from("companies").delete().eq("id",companyId);}catch{/* best effort */}}
    return NextResponse.json({error:e instanceof Error?e.message:"Create tenant failed"},{status:500});
  }
}
