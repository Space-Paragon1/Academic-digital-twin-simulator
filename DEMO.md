# Demo Script — Academic Digital Twin

## For professors, advisors, or a hackathon (5-minute walkthrough)

---

### Opening (30 sec)

> "This is the Academic Digital Twin — a simulation engine that models a student's
> semester week by week. Instead of guessing how your schedule will affect your GPA,
> you run it as a simulation first."

Point to the landing page. Highlight the stats row: **5 models, 168h/week, 20-week sim**.

---

### Step 1 — Profile & Courses (45 sec)

Navigate to `/profile`.

> "Every student has a profile with their enrolled courses, target GPA, work hours,
> and sleep target. You can enter courses manually or import directly from Canvas LMS."

Show the course list. Point out difficulty scores and credit hours.

---

### Step 2 — Run a Simulation (1 min)

Navigate to `/scenarios`. Click **New Scenario**.

> "I'll simulate a 16-week semester with 10 hours of work per week, 7 hours of sleep,
> and a spaced-repetition study strategy."

Set the sliders, click **Run Simulation**. Wait ~2 seconds.

> "The engine runs 5 coupled models simultaneously — cognitive load, knowledge
> retention, performance, fatigue, and burnout probability — one tick per week."

Show the result card: **Predicted GPA, burnout risk, sleep deficit**.

---

### Step 3 — Explore the Dashboard (45 sec)

Navigate to `/dashboard`.

> "The dashboard shows the full picture: GPA trajectory over the semester,
> cognitive load peaks, and how your 168 weekly hours are allocated."

Point to the **burnout risk gauge** and **peak overload weeks**.

> "Notice weeks 8 and 16 are flagged as high-overload — those are the exam weeks
> I configured. The model knows exam preparation increases cognitive load."

---

### Step 4 — Compare Scenarios (30 sec)

Navigate to `/compare`. Select two scenarios.

> "What if I worked fewer hours? I ran both — side by side you can see the GPA
> difference is 0.3 points, but burnout drops from HIGH to MEDIUM."

Show the overlaid GPA trajectory chart.

---

### Step 5 — Optimizer (30 sec)

Navigate to `/optimizer`. Set objective to **balanced**.

> "The optimizer uses differential evolution — a global search algorithm — to find
> the work/sleep/study combination that maximises GPA while keeping burnout below
> a threshold. It searches the full parameter space, not just a grid."

Click **Run Optimizer**. Show the result: optimal hours per course.

---

### Step 6 — AI Advisor (45 sec)

Navigate to `/advisor`.

> "The AI advisor is powered by Claude and automatically loads your latest simulation
> as context. It knows your GPA prediction, burnout risk, weekly trends, and worst
> overload week."

Type: *"What should I change to get my GPA above 3.5?"*

Show Claude's response referencing actual numbers from the simulation.

---

### Closing (30 sec)

> "The key insight is that this isn't a static GPA calculator. It's a dynamic
> system — decisions interact. Working more hours doesn't just take time away
> from studying; it increases fatigue, which raises cognitive load, which
> degrades retention, which lowers exam performance.
>
> Students who use this before the semester starts make better schedule decisions.
> That's what a digital twin is for."

---

## Key talking points

| Feature | Why it matters |
|---------|----------------|
| Week-by-week model | Captures cumulative fatigue and retention decay |
| 5 coupled subsystems | Trade-offs emerge automatically — not hand-tuned |
| Optimizer | Finds non-obvious schedules (e.g. sleeping more beats studying more) |
| Monte Carlo bands | Shows uncertainty, not false precision |
| Canvas import | No data entry — use real courses |
| AI advisor | Converts simulation numbers into plain English advice |

## Common questions

**"Is the GPA prediction accurate?"**
> It's calibrated to research on sleep, cognitive load, and spaced repetition.
> The goal is directional accuracy — showing you that working 20 hours/week with
> 6 hours of sleep is significantly worse than 10 hours/week with 8 hours of sleep.

**"Can it model my specific professor?"**
> Not yet — difficulty is estimated from course level. A future version could
> incorporate historical grade distributions.

**"What's the AI advisor actually doing?"**
> It's Claude with your simulation results injected as a system prompt. It can
> reference your specific GPA prediction, worst burnout week, and weekly trends.
