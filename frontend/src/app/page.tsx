import Link from "next/link";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M10 2L4 5.5V11l6 3.5 6-3.5V5.5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 10v5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.6" />
      </svg>
    ),
    title: "Time-Step Simulation",
    body: "Week-by-week dynamic model — not a static calculator. Each week updates cognitive state, retention, and fatigue.",
    color: "text-brand-600 bg-brand-50 border-brand-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 6v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "5 Interconnected Models",
    body: "Cognitive load, retention, performance, fatigue, and burnout — all coupled so trade-offs surface automatically.",
    color: "text-indigo-600 bg-indigo-50 border-indigo-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M3 10h14M10 3l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Schedule Optimizer",
    body: "Differential evolution search over work hours, sleep, and study strategy — finds the Pareto-optimal schedule for your GPA target.",
    color: "text-violet-600 bg-violet-50 border-violet-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <rect x="3" y="5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 5V4a1 1 0 012 0v1M11 5V4a1 1 0 012 0v1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    title: "Canvas LMS Import",
    body: "Pull your real enrolled courses directly from Canvas — no manual entry. Credits, difficulty, and workload pre-filled.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M4 14l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Scenario Comparison",
    body: "Overlay two scenarios on shared axes — GPA trajectory, cognitive load, and burnout probability side-by-side.",
    color: "text-amber-600 bg-amber-50 border-amber-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
    title: "CSV Export",
    body: "Download the full week-by-week snapshot table as CSV — every metric, every course, ready for your own analysis.",
    color: "text-rose-600 bg-rose-50 border-rose-100",
  },
];

const STATS = [
  { value: "5", label: "Simulation models" },
  { value: "168h", label: "Weekly budget modelled" },
  { value: "20 wks", label: "Max semester length" },
  { value: "3", label: "Optimization objectives" },
];

export default function Home() {
  return (
    <div className="mesh-gradient min-h-[calc(100vh-3.5rem)] overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 animate-fade-up">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/30 px-3.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400 mb-7 shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
          Academic Decision Intelligence
        </span>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-[1.1] mb-5 max-w-3xl">
          Your Academic{" "}
          <span className="gradient-brand-text">Digital Twin</span>
        </h1>

        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 max-w-xl leading-relaxed">
          Run what-if simulations on your semester before it happens. Predict GPA,
          burnout risk, and knowledge retention — then optimise.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link href="/profile">
            <Button size="lg" className="shadow-glow hover:shadow-glow">
              Get Started →
            </Button>
          </Link>
          <Link href="/scenarios">
            <Button size="lg" variant="secondary">
              View Scenarios
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 shadow-card w-full max-w-2xl mx-auto">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 px-6 py-4 text-center">
              <p className="text-2xl font-bold gradient-brand-text">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto animate-fade-in">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8">
          What&apos;s inside
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-5 shadow-card hover:shadow-card-md hover:-translate-y-px transition-all duration-200"
            >
              <div className={`inline-flex items-center justify-center rounded-xl border p-2 mb-3 ${f.color}`}>
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{f.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
