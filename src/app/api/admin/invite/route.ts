import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const inviteRoles=new Set(["owner","hr","manager","supervisor","employee"]);
export async function POST(req:Request){
  let createdUserId:string|undefined;
  try{
    const body=await req.json();
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
    const {data:p}=await supabase.from("profiles").select("company_id,role").eq("id",user.id).single();
    if(!p||!["owner","hr","platform_admin"].includes(p.role))return NextResponse.json({error:"Forbidden"},{status:403});

    const companyId=p.role==="platform_admin"?body.companyId:p.company_id;
    const email=String(body.email||"").trim().toLowerCase();
    const role=String(body.role||"employee");
    if(!companyId||!email.includes("@"))return NextResponse.json({error:"Company/email required"},{status:400});
    if(!inviteRoles.has(role))return NextResponse.json({error:"Role tidak valid"},{status:400});

    const admin=createAdminClient();
    const workforceRole=["employee","supervisor","manager","hr"].includes(role);
    if(workforceRole){
      const {data:sub}=await admin.from("subscriptions").select("status,plans(employee_limit)").eq("company_id",companyId).maybeSingle();
      if(sub && !["trial","active","past_due"].includes(sub.status))return NextResponse.json({error:"Subscription tidak aktif"},{status:402});
      const plan=sub?.plans as unknown as {employee_limit?:number|null}|null;
      if(plan?.employee_limit!=null){const {count}=await admin.from("employees").select("id",{count:"exact",head:true}).eq("company_id",companyId).is("archived_at",null);if((count||0)>=plan.employee_limit)return NextResponse.json({error:`Batas plan ${plan.employee_limit} karyawan tercapai`},{status:409});}
    }
    const redirectTo=`${process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin}/auth/callback`;
    const {data:inv,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo,data:{full_name:body.fullName||""}});
    if(inviteError)throw inviteError;
    if(!inv.user)throw new Error("Supabase tidak mengembalikan user invite");
    createdUserId=inv.user.id;

    let employeeId=body.employeeId||null;
    if(!employeeId&&workforceRole){
      const {data:e,error:eErr}=await admin.from("employees").insert({company_id:companyId,user_id:inv.user.id,employee_number:body.employeeNumber||`EMP-${Date.now().toString().slice(-6)}`,full_name:body.fullName||email.split("@")[0],email}).select("id").single();
      if(eErr)throw eErr;
      employeeId=e.id;
    }else if(employeeId){
      const {error:linkErr}=await admin.from("employees").update({user_id:inv.user.id}).eq("id",employeeId).eq("company_id",companyId);
      if(linkErr)throw linkErr;
    }

    const {error:profileErr}=await admin.from("profiles").update({company_id:companyId,employee_id:employeeId,role,full_name:body.fullName||"",is_active:true}).eq("id",inv.user.id);
    if(profileErr)throw profileErr;
    return NextResponse.json({ok:true,userId:inv.user.id,employeeId});
  }catch(e){
    if(createdUserId){try{await createAdminClient().auth.admin.deleteUser(createdUserId);}catch{/* best-effort rollback */}}
    return NextResponse.json({error:e instanceof Error?e.message:"Invite failed"},{status:500});
  }
}
