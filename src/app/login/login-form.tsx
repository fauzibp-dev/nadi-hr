"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){ e.preventDefault(); setBusy(true); setMessage(""); try { const supabase=createClient(); const {error}=await supabase.auth.signInWithPassword({email,password}); if(error) throw error; window.location.href=params.get("next")||"/admin"; } catch(err){ setMessage(err instanceof Error?err.message:"Login gagal"); } finally { setBusy(false); } }
  return <form onSubmit={submit}><div className="field"><label>Email</label><input className="input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@perusahaan.com"/></div><div className="field"><label>Password</label><input className="input" type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••"/></div>{message&&<div className="callout warning" style={{marginBottom:12}}>{message}</div>}<button className="btn primary" disabled={busy}>{busy?"Memeriksa…":"Masuk ke Nadi"}</button></form>;
}
