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
    title: "Simulation Engine",
    body: "Week-by-week dynamic model — not a static calculator. Each week updates cognitive state, retention, and fatigue.",
    color: "text-brand-600 bg-brand-50 border-brand-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 9l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "AI Advisor",
    body: "Chat with an AI advisor trained on your simulation data. Get personalised recommendations in natural language.",
    color: "text-indigo-600 bg-indigo-50 border-indigo-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    ),
    title: "Burnout Detection",
    body: "5 interconnected models detect burnout risk in real time. Catch overload before your semester spirals.",
    color: "text-red-600 bg-red-50 border-red-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M3 10h14M10 3l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Schedule Optimizer",
    body: "Differential evolution search over work hours, sleep, and study strategy — finds your Pareto-optimal schedule.",
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
    title: "Canvas Import",
    body: "Pull your enrolled courses directly from Canvas LMS — credits, difficulty, and workload pre-filled automatically.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  {
    icon: (
      <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
        <path d="M4 14l4-4 3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Goal Tracking",
    body: "Set your target GPA, track progress across simulations, and see exactly how close you are to achieving it.",
    color: "text-amber-600 bg-amber-50 border-amber-100",
  },
];

const STEPS = [
  { num: "1", title: "Create Profile", body: "Enter your courses, credits, and weekly schedule. Takes under 2 minutes." },
  { num: "2", title: "Run Simulation", body: "Configure a scenario — weeks, work hours, sleep, study strategy — and get instant predictions." },
  { num: "3", title: "Get Insights", body: "See your predicted GPA, burnout risk, and AI-powered recommendations for improvement." },
];

const STATS = [
  { value: "5", label: "Simulation models" },
  { value: "AI", label: "Powered advice" },
  { value: "Real-time", label: "GPA prediction" },
  { value: "Free", label: "To use forever" },
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
          Simulate Your{" "}
          <span className="gradient-brand-text">Academic Future</span>
        </h1>

        <p className="text-lg text-slate-500 dark:text-slate-400 mb-10 max-w-xl leading-relaxed">
          Run what-if scenarios on your semester before it happens. Predict GPA,
          detect burnout risk early, and optimise your schedule with AI.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          <Link href="/login">
            <Button size="lg" className="shadow-glow hover:shadow-glow">
              Get Started Free →
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="secondary">
              See How It Works
            </Button>
          </a>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-200 dark:bg-slate-700 shadow-card w-full max-w-2xl mx-auto">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-900 px-6 py-4 text-center">
              <p className="text-2xl font-bold gradient-brand-text">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-5xl mx-auto animate-fade-in">
        <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-8">
          Everything you need
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-5 shadow-card card-hover hover:-translate-y-px transition-all duration-200"
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

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="px-6 pb-20 max-w-4xl mx-auto">
        <h2 className="text-center text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          How It Works
        </h2>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-10">
          From signup to insights in minutes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div key={step.num} className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-600 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md mb-4">
                {step.num}
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-2xl mx-auto text-center">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur p-8 shadow-card">
          <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed italic mb-4">
            &ldquo;I was about to take 18 credits with a part-time job. Academic Twin showed me I&apos;d hit 87% burnout probability by week 6. I dropped one course and finished with a 3.7 GPA instead.&rdquo;
          </p>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            — Jordan T., Computer Science Junior
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 text-amber-400" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="px-6 pb-20 max-w-2xl mx-auto text-center">
        <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 p-10 shadow-glow">
          <h2 className="text-2xl font-bold text-white mb-3">
            Ready to take control of your GPA?
          </h2>
          <p className="text-brand-100 text-sm mb-6 leading-relaxed">
            Join students who plan smarter, study better, and avoid burnout.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-white text-brand-700 hover:bg-brand-50 shadow-md font-bold">
              Start Simulating Free →
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-600">
          &copy; {new Date().getFullYear()} Academic Digital Twin Simulator &middot; MIT License &middot; Built for students, by students.
        </p>
      </footer>
    </div>
  );
}
