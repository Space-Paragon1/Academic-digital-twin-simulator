import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Scenarios — Academic Digital Twin",
  description: "Compare two simulation scenarios side-by-side across GPA, cognitive load, and burnout.",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
