import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req:Request){
  if(process.env.NEXT_PUBLIC_DEMO_MODE!=="true") { const supabase=await createClient(); await supabase.auth.signOut(); }
  return NextResponse.redirect(new URL('/login',req.url),303);
}
