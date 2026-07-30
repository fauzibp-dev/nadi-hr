import { PageHead, Card, CardHead } from "@/components/ui";
import { ApprovalInbox } from "@/components/approval-inbox";
export default function Page(){return <><PageHead title="Requests" description="Satu inbox untuk leave, sick, permission, overtime, correction, WFH, business trip, dan shift swap."/><Card><CardHead title="Need action" subtitle="Engine approval multi-step mengikuti workflow tenant"/><ApprovalInbox/></Card></>}
