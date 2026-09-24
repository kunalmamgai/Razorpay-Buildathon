import { SectionHeading, Window, LogoMark } from "./ui.jsx";

const sidebar = [
  { title: null, items: ["Inbox", "My agents", "Run history", "Pulse"] },
  { title: "Workspace", items: ["Agents", "Schedules", "More"] },
  { title: "Favorites", items: ["Daily briefing", "Research agents", "Budget watch"] },
];

const weeks = ["03", "10", "17", "24", "31", "07", "14"];

const rows = [
  { name: "Daily intelligence", trigger: "Cron · 08:30", steps: ["Research", "Brief"], col: 1, span: 4 },
  { name: "Lead response", trigger: "Webhook", steps: ["Enrich", "Qualify"], col: 2, span: 4 },
  { name: "Customer health", trigger: "Hourly", steps: ["Score", "Review", "Escalate"], col: 3, span: 5 },
  { name: "Research agents", trigger: "Adaptive", steps: ["Gather", "Synthesize"], col: 1, span: 4 },
  { name: "Invoice follow-up", trigger: "Event-driven", steps: ["Review", "Send"], col: 4, span: 4 },
  { name: "Memory maintenance", trigger: "Agent-set", steps: ["Summarize", "Persist"], col: 3, span: 5 },
];

const signals = [
  { title: "Schedule on signal.", body: "Start work from a cron, webhook, or an agent-selected wake-up." },
  { title: "Resume with context.", body: "Restore memory, tools, and durable state on every new run." },
  { title: "Run with guardrails.", body: "Use budget caps, logs, and timeouts to govern every job." },
];

const cards = [
  {
    n: "01",
    title: "Stateful agent runs",
    body: "Schedule recurring agents with persistent memory, tool access, and context across separate execution runs.",
    stat: "99.7%",
    label: "successful runs",
  },
  {
    n: "02",
    title: "Event-driven wakeups",
    body: "Wake agents instantly from webhooks, file uploads, or database changes without polling or brittle scripts.",
    stat: "50+",
    label: "trigger sources",
  },
  {
    n: "03",
    title: "Adaptive scheduling",
    body: "Let agents assess their output, set the next wake-up time, and keep recurring work on track automatically.",
    stat: "15ms",
    label: "strict timeout",
  },
];

function Sidebar() {
  return (
    <aside className="hidden w-52 shrink-0 border-r border-white/10 p-4 md:block">
      <div className="mb-6 flex items-center gap-2 px-2">
        <LogoMark className="h-5 w-5" />
        <span className="text-sm font-semibold">Qronos</span>
      </div>
      {sidebar.map((group, i) => (
        <div key={i} className="mb-5">
          {group.title && <p className="mb-1.5 px-2 text-xs text-white/40">{group.title}</p>}
          <ul>
            {group.items.map((item) => (
              <li
                key={item}
                className={`rounded-md px-2 py-1.5 text-sm ${item === "Schedules" ? "bg-white/10 text-white" : "text-white/55"}`}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

function ScheduleGrid() {
  return (
    <div className="min-w-[640px] flex-1 p-5">
      <div className="grid grid-cols-7 text-xs text-white/40">
        <span className="col-span-5">Aug</span>
        <span className="col-span-2">Sep</span>
      </div>
      <div className="mt-1 grid grid-cols-7 border-b border-white/10 pb-2 text-xs text-white/60">
        {weeks.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="relative mt-3 space-y-2.5">
        {/* week gridlines */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-7">
          {weeks.map((w) => (
            <span key={w} className="border-l border-white/[0.06]" />
          ))}
        </div>

        {rows.map((r) => (
          <div key={r.name} className="relative grid grid-cols-7">
            <div
              className="flex items-center gap-3 overflow-hidden rounded-lg border border-white/15 bg-white/[0.07] px-3 py-2"
              style={{ gridColumn: `${r.col} / span ${Math.min(r.span, 8 - r.col)}` }}
            >
              <div className="min-w-0 shrink-0">
                <p className="truncate text-sm font-medium text-white">{r.name}</p>
                <p className="text-xs text-white/50">{r.trigger}</p>
              </div>
              <ul className="ml-auto hidden gap-1.5 lg:flex">
                {r.steps.map((s) => (
                  <li key={s} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function About() {
  return (
    <section id="about" className="relative scroll-mt-20 bg-black px-5 pb-24 pt-28 sm:px-10 sm:pt-36">
      <SectionHeading
        lead="Stateful execution."
        tail="Qronos keeps agents in motion."
        sub="Qronos is the stateful runtime for autonomous work—preserving memory, tools, and context across every governed run."
      />

      <div className="mx-auto mt-16 max-w-6xl">
        <Window>
          <div className="flex overflow-x-auto">
            <Sidebar />
            <ScheduleGrid />
          </div>
        </Window>

        <ul className="mt-12 grid gap-8 md:grid-cols-3">
          {signals.map((s) => (
            <li key={s.title}>
              <h3 className="text-lg font-medium text-white">{s.title}</h3>
              <p className="mt-2 max-w-xs text-white/55">{s.body}</p>
            </li>
          ))}
        </ul>

        <ul className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
          {cards.map((c) => (
            <li key={c.n} className="flex flex-col bg-black p-7">
              <span className="text-sm text-white/40">{c.n}</span>
              <h3 className="mt-6 text-2xl font-medium tracking-tight">{c.title}</h3>
              <p className="mt-3 flex-1 text-white/55">{c.body}</p>
              <p className="mt-10 flex items-baseline gap-2">
                <span className="text-4xl font-medium tracking-tight">{c.stat}</span>
                <span className="text-sm text-white/50">{c.label}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
