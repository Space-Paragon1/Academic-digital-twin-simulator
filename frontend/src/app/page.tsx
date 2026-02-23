import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="max-w-3xl">
        <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 mb-6">
          Academic Decision Intelligence
        </span>
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
          Your Academic{" "}
          <span className="text-brand-600">Digital Twin</span>
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Run what-if simulations on your future. Predict GPA, burnout risk, and
          optimal schedules before making real-world academic decisions.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link href="/profile">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/scenarios">
            <Button size="lg" variant="secondary">View Scenarios</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          {[
            {
              title: "Time-Step Simulation",
              body: "Week-by-week dynamic model of your academic life, not just a static calculator.",
            },
            {
              title: "5 Interconnected Models",
              body: "Cognitive load, retention, performance, fatigue, and burnout — all linked.",
            },
            {
              title: "Schedule Optimizer",
              body: "Find the optimal work hours, sleep, and study strategy for your GPA target.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
