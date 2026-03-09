import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile — Academic Digital Twin",
  description: "Manage your student profile and enrolled courses.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
