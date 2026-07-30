import Link from "next/link";
import { Icon } from "@/components/icon";

export default function Home() {
  return <main style={{minHeight:"100vh",padding:"32px",display:"grid",placeItems:"center"}}>
    <div style={{width:"min(1040px,100%)",display:"grid",gridTemplateColumns:"1.2fr .8fr",gap:"18px"}}>
      <section className="hero-attendance" style={{minHeight:460,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:34}}>
        <div className="brand"><div className="brandmark" style={{background:"var(--brand-2)",color:"var(--brand)"}}>N</div><div className="brandtext"><strong>Nadi HR</strong><span style={{color:"#bdcbc2"}}>people operations, tanpa ribet</span></div></div>
        <div><div className="eyebrow">Workforce platform</div><h2 style={{fontSize:45,maxWidth:700}}>Absensi yang terasa ringan untuk karyawan, tetap serius untuk HR.</h2><p style={{fontSize:14}}>Geofence, jadwal, cuti, lembur, approval, audit, multi-company, subscription, dan insight dalam satu sistem yang dibangun untuk mobile lebih dulu.</p><div className="actions"><Link className="btn" href="/login">Masuk ke workspace <Icon name="arrow" size={15}/></Link><Link className="btn ghost" style={{color:"white",borderColor:"rgba(255,255,255,.24)"}} href="/employee">Lihat demo</Link></div></div>
      </section>
      <section className="card cardpad" style={{display:"flex",flexDirection:"column",justifyContent:"space-between"}}><div><span className="badge success">Demo siap dilihat</span><h2 style={{fontSize:30,letterSpacing:"-.045em",margin:"18px 0 10px"}}>Tiga pengalaman, satu codebase.</h2><p className="muted" style={{fontSize:13,lineHeight:1.7}}>Employee portal untuk aktivitas harian, HR command center untuk operasional, dan platform console untuk bisnis SaaS.</p></div><div className="list"><Link href="/employee" className="listrow"><div className="listmain"><div className="doticon"><Icon name="clock"/></div><div><strong>Employee portal</strong><span>Absen, jadwal, pengajuan, riwayat</span></div></div><Icon name="arrow"/></Link><Link href="/admin" className="listrow"><div className="listmain"><div className="doticon"><Icon name="people"/></div><div><strong>HR & manager</strong><span>People, attendance, approval, reports</span></div></div><Icon name="arrow"/></Link><Link href="/platform" className="listrow"><div className="listmain"><div className="doticon"><Icon name="building"/></div><div><strong>Platform admin</strong><span>Tenant, plan, usage, system health</span></div></div><Icon name="arrow"/></Link></div></section>
    </div>
  </main>;
}
