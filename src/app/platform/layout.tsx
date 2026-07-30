import { AppShell } from "@/components/app-shell"; import { getUserContext } from "@/lib/context";
export default async function PlatformLayout({children}:{children:React.ReactNode}){ const ctx=await getUserContext("platform"); return <AppShell ctx={ctx}>{children}</AppShell>; }
