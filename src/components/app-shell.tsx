"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { navForRole } from "@/lib/nav";
import type { UserContext } from "@/types/app";

export function AppShell({ ctx, children }: { ctx: UserContext; children: React.ReactNode }) {
  const pathname = usePathname();
  const nav = navForRole(ctx.role);
  const initials = ctx.name.split(" ").slice(0,2).map(v=>v[0]).join("");
  let lastSection = "";
  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" href={ctx.role === "employee" ? "/employee" : ctx.role === "platform_admin" ? "/platform" : "/admin"}>
        <div className="brandmark">N</div><div className="brandtext"><strong>Nadi</strong><span>people operations</span></div>
      </Link>
      <nav className="nav" aria-label="Navigasi utama">
        {nav.map((item) => {
          const section = item.section && item.section !== lastSection ? item.section : null;
          if (item.section) lastSection = item.section;
          const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/employee" && item.href !== "/platform" && pathname.startsWith(item.href));
          return <div key={item.href}>{section && <div className="navlabel">{section}</div>}<Link className={`navitem ${active ? "active" : ""}`} href={item.href}><Icon name={item.icon} size={17}/>{item.label}</Link></div>;
        })}
      </nav>
      <div className="sidebarfoot">
        <div className="companychip"><div className="listmain"><div className="avatar">{initials}</div><div><strong>{ctx.name}</strong><span>{ctx.companyName}</span></div></div><Icon name="chevron" size={15}/></div>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb"><span>{ctx.companyName}</span><span>/</span><strong style={{color:"var(--ink)"}}>{pathname.split("/").filter(Boolean).slice(-1)[0] || "overview"}</strong></div><div className="topactions"><div className="command"><Icon name="search" size={15}/>Cari orang, absensi, atau menu…</div><button className="iconbtn" aria-label="Notifikasi"><Icon name="bell" size={17}/></button><div className="avatar">{initials}</div></div></header>
      <div className="content">{children}</div>
    </main>
    <nav className="mobile-nav" aria-label="Navigasi mobile">{nav.slice(0,5).map(item => { const active = pathname === item.href || pathname.startsWith(item.href + "/"); return <Link key={item.href} className={active?"active":""} href={item.href}><Icon name={item.icon} size={19}/><span>{item.label}</span></Link>; })}</nav>
  </div>;
}
