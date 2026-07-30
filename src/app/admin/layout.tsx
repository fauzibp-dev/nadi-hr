import { AppShell } from "@/components/app-shell"; import { getUserContext } from "@/lib/context";
export default async function AdminLayout({children}:{children:React.ReactNode}){ const ctx=await getUserContext("admin"); return <AppShell ctx={ctx}>{children}</AppShell>; }
