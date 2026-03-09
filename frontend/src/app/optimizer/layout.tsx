import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Optimizer — Academic Digital Twin",
  description: "Find the optimal work hours, sleep, and study strategy for your target GPA.",
};

export default function OptimizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
