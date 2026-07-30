import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic="force-dynamic";
export async function GET(req:Request){const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});try{const {data,error}=await createAdminClient().rpc("run_platform_maintenance");if(error)throw error;return NextResponse.json(data);}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Maintenance failed"},{status:500});}}
