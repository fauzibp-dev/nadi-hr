export type Role = "platform_admin" | "owner" | "hr" | "manager" | "supervisor" | "employee";
export type AttendanceStatus = "on_time" | "late" | "leave" | "sick" | "absent" | "review";

export type UserContext = {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  companyName: string;
  employeeId?: string;
  demo: boolean;
};

export type NavItem = { href: string; label: string; icon: string; section?: string };
