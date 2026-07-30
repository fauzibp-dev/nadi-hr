import { Icon } from "@/components/icon";

export function PageHead({ title, description, children }: { title:string; description?:string; children?:React.ReactNode }) {
  return <div className="pagehead"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{children && <div className="actions">{children}</div>}</div>;
}
export function Button({ children, icon, variant="default", type="button", onClick, disabled }: { children:React.ReactNode; icon?:string; variant?:"default"|"primary"|"ghost"|"danger"; type?:"button"|"submit"; onClick?:()=>void; disabled?:boolean }) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`btn ${variant === "default" ? "" : variant}`}>{icon && <Icon name={icon} size={15}/>} {children}</button>;
}
export function Kpi({ label,value,delta,tone }: {label:string;value:string|number;delta?:string;tone?:"good"}) { return <div className="card kpi"><div className="label">{label}</div><div className="value">{value}</div>{delta&&<div className={`delta ${tone||""}`}>{delta}</div>}</div>; }
export function Badge({ children, tone="" }: {children:React.ReactNode;tone?:""|"success"|"warning"|"danger"|"info"}) { return <span className={`badge ${tone}`}>{children}</span>; }
export function Card({ children, className="" }: {children:React.ReactNode; className?:string}) { return <section className={`card ${className}`}>{children}</section>; }
export function CardHead({ title,subtitle,action }: {title:string;subtitle?:string;action?:React.ReactNode}) { return <div className="cardhead"><div><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>{action}</div>; }
export function Avatar({ label }: {label:string}) { return <div className="avatar">{label}</div>; }
export function Field({ label, children, full=false }: {label:string;children:React.ReactNode;full?:boolean}) { return <div className={`field ${full?"full":""}`}><label>{label}</label>{children}</div>; }
