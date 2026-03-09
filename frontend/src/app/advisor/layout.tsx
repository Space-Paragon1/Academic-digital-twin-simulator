import type { Metadata } from "next";
import { AdvisorTabs } from "@/components/layout/AdvisorTabs";

export const metadata: Metadata = {
  title: "Advisor — Academic Digital Twin",
  description: "AI-powered academic guidance, goal targeting, and multi-student monitoring.",
};

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Academic Advisor</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          AI-powered guidance, schedule optimization, and multi-student monitoring
        </p>
      </div>

      <AdvisorTabs />

      {children}
    </div>
  );
}
