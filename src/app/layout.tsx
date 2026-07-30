import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nadi HR", template: "%s · Nadi HR" },
  description: "Modern multi-tenant HR attendance platform with geofence, workforce scheduling, approvals, security, and analytics."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
