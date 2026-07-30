import { NextResponse } from "next/server";
export async function GET(){ return NextResponse.json({ok:true,service:'nadi-web',time:new Date().toISOString(),demo:process.env.NEXT_PUBLIC_DEMO_MODE==='true'}); }
