import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scenarios — Academic Digital Twin",
  description: "Configure and run semester simulations to predict GPA and burnout risk.",
};

export default function ScenariosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
