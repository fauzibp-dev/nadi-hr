import fs from "node:fs";
import path from "node:path";
const root=process.cwd(); let failed=0;
function ok(name,pass,detail=""){console.log(`${pass?"✓":"✗"} ${name}${detail?` — ${detail}`:""}`);if(!pass)failed++;}
for(const f of ["package.json","tsconfig.json","vercel.json"]){try{JSON.parse(fs.readFileSync(path.join(root,f),"utf8"));ok(`JSON ${f}`,true);}catch(e){ok(`JSON ${f}`,false,String(e));}}
const required=["src/app/layout.tsx","src/app/api/attendance/submit/route.ts","src/lib/supabase/server.ts","supabase/config.toml","supabase/seed.sql","docs/DEPLOYMENT.md"];
for(const f of required)ok(`required ${f}`,fs.existsSync(path.join(root,f)));
const migDir=path.join(root,"supabase/migrations");const migrations=fs.readdirSync(migDir).filter(x=>x.endsWith(".sql")).sort();ok("timestamped migrations",migrations.length>=12&&migrations.every(x=>/^\d{14}_[a-z0-9_]+\.sql$/.test(x)),`${migrations.length} files`);
for(const f of migrations){const s=fs.readFileSync(path.join(migDir,f),"utf8");ok(`SQL delimiter ${f}`,((s.match(/\$\$/g)||[]).length%2)===0);}
const env=fs.readFileSync(path.join(root,".env.example"),"utf8");for(const key of ["NEXT_PUBLIC_SUPABASE_URL","NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","SUPABASE_SERVICE_ROLE_KEY","DEVICE_PEPPER","CRON_SECRET","NEXT_PUBLIC_DEMO_MODE"])ok(`env ${key}`,new RegExp(`^${key}=`,`m`).test(env));
const attendance=fs.readFileSync(path.join(migDir,"20260730090100_attendance.sql"),"utf8");ok("attendance RPC service-role only",attendance.includes("grant execute on function public.submit_attendance_event")&&attendance.includes("to service_role")&&!attendance.includes("to authenticated;\n"));
if(failed){console.error(`\n${failed} static check(s) failed.`);process.exit(1);}console.log(`\nAll static project checks passed.`);
