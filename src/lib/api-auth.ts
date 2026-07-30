import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types/app";

export async function requireApiProfile(allowed?: Role[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const, status: 401, supabase };
  const { data: profile, error } = await supabase.from("profiles")
    .select("id,company_id,employee_id,role,email,full_name")
    .eq("id", user.id).single();
  if (error || !profile) return { error: "Profile not found" as const, status: 403, supabase };
  const role = profile.role as Role;
  if (allowed && !allowed.includes(role)) return { error: "Forbidden" as const, status: 403, supabase };
  return { user, profile: { ...profile, role }, supabase };
}
