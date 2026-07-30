import { redirect } from "next/navigation";
import type { Role, UserContext } from "@/types/app";
import { createClient } from "@/lib/supabase/server";

const demoContexts: Record<string, UserContext> = {
  employee: { id:"demo-employee", name:"Andi Pratama", email:"andi@nadi.local", role:"employee", companyId:"demo-company", companyName:"PT Ruang Tumbuh", employeeId:"demo-emp", demo:true },
  admin: { id:"demo-hr", name:"Maya Putri", email:"maya@nadi.local", role:"hr", companyId:"demo-company", companyName:"PT Ruang Tumbuh", employeeId:"demo-hr-emp", demo:true },
  platform: { id:"demo-platform", name:"Raka", email:"admin@nadi.local", role:"platform_admin", companyId:"platform", companyName:"Nadi", demo:true }
};

export async function getUserContext(kind: "employee"|"admin"|"platform"): Promise<UserContext> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.NEXT_PUBLIC_SUPABASE_URL) return demoContexts[kind];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/${kind}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,company_id,employee_id,companies(name)")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login?error=profile");

  const role = profile.role as Role;
  if (kind === "employee" && role !== "employee") redirect("/admin");
  if (kind === "platform" && role !== "platform_admin") redirect("/admin");
  if (kind === "admin" && ["employee", "platform_admin"].includes(role)) redirect(role === "employee" ? "/employee" : "/platform");

  const companyRel = profile.companies as unknown as { name?: string } | null;
  return {
    id: profile.id,
    name: profile.full_name || profile.email,
    email: profile.email,
    role,
    companyId: profile.company_id,
    companyName: companyRel?.name || "Workspace",
    employeeId: profile.employee_id || undefined,
    demo: false
  };
}
