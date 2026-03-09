import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Academic Digital Twin",
  description: "View your latest simulation results: GPA trajectory, burnout risk, and cognitive load.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
