import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashDeviceToken } from "@/lib/device";

const MAX_SELFIE_BYTES = 900_000;
function parseDataUrl(value:string){ const m=value.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/); if(!m) throw new Error("Format selfie tidak valid"); const buf=Buffer.from(m[2],"base64"); if(buf.length>MAX_SELFIE_BYTES) throw new Error("Selfie terlalu besar"); return {contentType:m[1],buffer:buf}; }

export async function POST(req:Request){
  try{
    const body=await req.json();
    if(process.env.NEXT_PUBLIC_DEMO_MODE==="true") return NextResponse.json({ok:true,message:"Mode demo: validasi geofence, policy dan evidence disimulasikan."});
    const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.json({error:"Sesi tidak valid"},{status:401});
    const {data:profile}=await supabase.from("profiles").select("company_id,employee_id").eq("id",user.id).single(); if(!profile?.employee_id) return NextResponse.json({error:"Profil karyawan tidak terhubung"},{status:403});
    const loc=body.location; if(!loc||![loc.latitude,loc.longitude,loc.accuracy].every((v:unknown)=>typeof v==="number"&&Number.isFinite(v))) return NextResponse.json({error:"Lokasi tidak valid"},{status:400});
    if(typeof body.challengeToken!=="string"||body.challengeToken.length<20) return NextResponse.json({error:"Attendance challenge tidak valid"},{status:400});
    const admin=createAdminClient(); const challengeHash=createHash('sha256').update(body.challengeToken).digest('hex'); const nowIso=new Date().toISOString();
    const {data:challengeRow,error:challengeError}=await admin.from('attendance_challenges').update({used_at:nowIso}).eq('nonce_hash',challengeHash).eq('employee_id',profile.employee_id).is('used_at',null).gt('expires_at',nowIso).select('id,challenge').maybeSingle();
    if(challengeError) throw challengeError; if(!challengeRow) return NextResponse.json({error:'Attendance challenge kedaluwarsa atau sudah digunakan'},{status:409});
    let deviceId:string|null=null,deviceVerified=false;
    if(typeof body.deviceToken==="string"&&body.deviceToken){
      try{
        const deviceHash=hashDeviceToken(profile.employee_id,body.deviceToken);
        const {data:known}=await admin.from("employee_devices").select("id,trusted,attendance_allowed,revoked_at").eq("employee_id",profile.employee_id).eq("device_hash",deviceHash).maybeSingle();
        if(known){deviceId=known.id;deviceVerified=Boolean(known.trusted&&known.attendance_allowed&&!known.revoked_at);await admin.from("employee_devices").update({last_seen_at:new Date().toISOString()}).eq("id",known.id);}
        else{const {data:newDevice}=await admin.from("employee_devices").insert({company_id:profile.company_id,employee_id:profile.employee_id,device_hash:deviceHash,device_label:"Browser device",platform:String(body.devicePlatform||req.headers.get("user-agent")||"").slice(0,100),last_seen_at:new Date().toISOString()}).select("id").single();deviceId=newDevice?.id||null;}
      }catch{/* Device binding is an extra signal unless company policy requires it. */}
    }
    const photo=parseDataUrl(body.selfie||""); const ext=photo.contentType.includes("png")?"png":photo.contentType.includes("webp")?"webp":"jpg"; const path=`${profile.company_id}/${profile.employee_id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const upload=await admin.storage.from("attendance-evidence").upload(path,photo.buffer,{contentType:photo.contentType,upsert:false}); if(upload.error) throw upload.error;
    const mode=process.env.FACE_VERIFICATION_MODE||"evidence"; let faceStatus="evidence_only"; let providerScore:number|null=null;
    if(mode==="webhook"&&process.env.FACE_VERIFICATION_WEBHOOK_URL){
      const {data:signed,error:signedError}=await admin.storage.from("attendance-evidence").createSignedUrl(path,60);
      if(signedError||!signed?.signedUrl) throw signedError||new Error("Gagal membuat URL evidence sementara");
      const verify=await fetch(process.env.FACE_VERIFICATION_WEBHOOK_URL,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${process.env.FACE_VERIFICATION_WEBHOOK_SECRET||""}`},body:JSON.stringify({userId:user.id,employeeId:profile.employee_id,evidencePath:path,evidenceUrl:signed.signedUrl,challenge:challengeRow.challenge})});
      if(!verify.ok){ await admin.storage.from("attendance-evidence").remove([path]); return NextResponse.json({error:"Verifikasi wajah/liveness gagal"},{status:422}); }
      const result=await verify.json();
      if(result.status!=="verified"){ await admin.storage.from("attendance-evidence").remove([path]); return NextResponse.json({error:"Wajah/liveness tidak terverifikasi"},{status:422}); }
      faceStatus="verified"; providerScore=typeof result.score==="number"?result.score:null;
    }
    const {data,error}=await admin.rpc("submit_attendance_event",{p_user_id:user.id,p_event_type:body.eventType||"check_in",p_latitude:loc.latitude,p_longitude:loc.longitude,p_accuracy:loc.accuracy,p_evidence_path:path,p_face_status:faceStatus,p_face_score:providerScore,p_liveness_status:mode==="webhook"?"verified":"challenge_evidence",p_device_hint:req.headers.get("user-agent")||"unknown",p_ip:(req.headers.get("x-forwarded-for")||"").split(",")[0].trim()||null,p_device_id:deviceId,p_device_verified:deviceVerified}); if(error){ await admin.storage.from("attendance-evidence").remove([path]); return NextResponse.json({error:error.message},{status:422}); }
    return NextResponse.json({ok:true,message:data?.message||"Absensi berhasil dicatat",result:data});
  }catch(e){ return NextResponse.json({error:e instanceof Error?e.message:"Terjadi kesalahan"},{status:500}); }
}
