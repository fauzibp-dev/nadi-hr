import type { NavItem, Role } from "@/types/app";

export const employeeNav: NavItem[] = [
  { href: "/employee", label: "Hari ini", icon: "home" },
  { href: "/employee/attendance", label: "Absensi", icon: "clock" },
  { href: "/employee/schedule", label: "Jadwal", icon: "calendar" },
  { href: "/employee/requests", label: "Pengajuan", icon: "check" },
  { href: "/employee/history", label: "Riwayat", icon: "report" },
  { href: "/employee/documents", label: "Dokumen", icon: "file", section: "Lainnya" },
  { href: "/employee/notifications", label: "Notifikasi", icon: "bell" },
  { href: "/employee/profile", label: "Profil & perangkat", icon: "people" }
];

export const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "home" },
  { href: "/admin/people", label: "People", icon: "people" },
  { href: "/admin/attendance", label: "Attendance", icon: "clock" },
  { href: "/admin/schedule", label: "Schedule", icon: "calendar" },
  { href: "/admin/requests", label: "Requests", icon: "check" },
  { href: "/admin/organization", label: "Organization", icon: "building", section: "Workforce" },
  { href: "/admin/offices", label: "Office & Location", icon: "location" },
  { href: "/admin/documents", label: "Documents", icon: "file" },
  { href: "/admin/announcements", label: "Announcements", icon: "bell" },
  { href: "/admin/reports", label: "Reports", icon: "report", section: "Insights" },
  { href: "/admin/analytics", label: "Analytics", icon: "activity" },
  { href: "/admin/security", label: "Security", icon: "shield" },
  { href: "/admin/settings", label: "Settings", icon: "settings", section: "Workspace" }
];

export const platformNav: NavItem[] = [
  { href: "/platform", label: "Platform", icon: "home" },
  { href: "/platform/companies", label: "Companies", icon: "building" },
  { href: "/platform/subscriptions", label: "Subscriptions", icon: "wallet" },
  { href: "/platform/usage", label: "Usage", icon: "activity" },
  { href: "/platform/features", label: "Feature flags", icon: "spark", section: "Operations" },
  { href: "/platform/health", label: "System health", icon: "shield" },
  { href: "/platform/support", label: "Support", icon: "help" },
  { href: "/platform/logs", label: "Audit & logs", icon: "file" }
];

export function navForRole(role: Role) {
  if (role === "platform_admin") return platformNav;
  if (role === "employee") return employeeNav;
  return adminNav;
}
