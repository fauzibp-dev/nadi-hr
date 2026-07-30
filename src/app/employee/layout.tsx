import { AppShell } from "@/components/app-shell"; import { getUserContext } from "@/lib/context";
export default async function EmployeeLayout({children}:{children:React.ReactNode}){ const ctx=await getUserContext("employee"); return <AppShell ctx={ctx}>{children}</AppShell>; }
