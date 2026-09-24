import { SectionHeading, Window, LogoMark } from "./ui.jsx";

const nav = [
  { title: null, items: ["Inbox", "Insights", "My agents", "Run history", "Pulse"] },
  { title: "Workspace", items: ["Agents", "Schedules", "More"] },
  { title: "Favorites", items: ["Daily briefing", "Research agents", "Budget watch"] },
];

const stats = [
  { label: "Agent tasks completed", value: "3,389" },
  { label: "Agent tasks in progress", value: "1,128" },
  { label: "Agent tasks in review", value: "729" },
];

const assignees = [
  ["AM", 120], ["JT", 98], ["RK", 132], ["SL", 88], ["MP", 150], ["DN", 76], ["KC", 110],
  ["RB", 64], ["EA", 140], ["NW", 92], ["CV", 70], ["HF", 128], ["IO", 58], ["LG", 104],
];
const yTicks = [180, 160, 140, 120, 100, 80, 60, 40, 20, 0];

const agents = [
  { name: "Gemini", dot: "bg-sky-400" },
  { name: "Codex", dot: "bg-white" },
  { name: "Claude", dot: "bg-orange-400" },
];

const projects = [
  ["Daily intelligence", 239, 81, 76, 82],
  ["Lead response", 181, 25, 151, 5],
  ["Customer health", 95, 22, 44, 29],
  ["Support queue", 88, 0, 12, 76],
  ["Research agents", 72, 59, 13, 0],
  ["Invoice follow-up", 51, 0, 51, 0],
  ["Memory maintenance", 50, 3, 0, 47],
  ["Outbound follow-up", 45, 18, 21, 6],
  ["Pipeline review", 43, 12, 24, 7],
  ["Revenue operations", 38, 14, 8, 16],
];

function Sidebar() {
  return (
    <aside className="hidden w-52 shrink-0 border-r border-white/10 p-4 lg:block">
      <div className="mb-6 flex items-center gap-2 px-2">
        <LogoMark className="h-5 w-5" />
        <span className="text-sm font-semibold">Qronos</span>
      </div>
      {nav.map((group, i) => (
        <div key={i} className="mb-5">
          {group.title && <p className="mb-1.5 px-2 text-xs text-white/40">{group.title}</p>}
          <ul>
            {group.items.map((item) => (
              <li
                key={item}
                className={`rounded-md px-2 py-1.5 text-sm ${item === "Insights" ? "bg-white/10 text-white" : "text-white/55"}`}
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

function BarChart() {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <p className="text-sm font-medium">Agent tasks per assignee</p>
      <div className="mt-4 flex gap-3">
        <div className="flex h-56 flex-col justify-between pb-6 text-right text-[10px] text-white/35">
          {yTicks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="absolute inset-x-0 top-1.5 bottom-6 flex flex-col justify-between" aria-hidden="true">
            {yTicks.map((t) => (
              <span key={t} className="border-t border-white/[0.06]" />
            ))}
          </div>
          <ul className="relative flex h-56 items-end justify-between gap-1.5 sm:gap-2.5">
            {assignees.map(([who, v]) => (
              <li key={who} className="group flex h-full flex-1 flex-col justify-end" title={`${who}: ${v} tasks`}>
                <div className="flex flex-1 items-end pb-0">
                  <div
                    className="w-full rounded-t-sm bg-white/70 transition-colors group-hover:bg-white"
                    style={{ height: `${(v / 180) * 100}%` }}
                  />
                </div>
                <span className="h-6 pt-1.5 text-center text-[10px] text-white/45">{who}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProjectsTable() {
  return (
    <div className="rounded-xl border border-white/10">
      <p className="p-4 text-sm font-medium">Projects agents are working on</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-y border-white/10 text-xs text-white/45">
              <th className="px-4 py-2.5 font-normal">Project</th>
              <th className="px-4 py-2.5 font-normal">Tasks</th>
              {agents.map((a) => (
                <th key={a.name} className="px-4 py-2.5 font-normal">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${a.dot}`} />
                    {a.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(([name, total, ...per]) => (
              <tr key={name} className="border-b border-white/[0.06] last:border-0">
                <td className="px-4 py-2.5">{name}</td>
                <td className="px-4 py-2.5 tabular-nums">{total}</td>
                {per.map((n, i) => (
                  <td key={i} className={`px-4 py-2.5 tabular-nums ${n === 0 ? "text-white/25" : "text-white/70"}`}>
                    {n}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Insights() {
  return (
    <section id="insights" className="scroll-mt-20 bg-black px-5 py-24 sm:px-10 sm:py-32">
      <SectionHeading
        lead="Track agent insights"
        tail="in real time."
        sub="Monitor every agent task as it progresses, with live status, activity, and the context your team needs to keep work moving."
      />

      <div className="mx-auto mt-16 max-w-6xl">
        <Window>
          <div className="flex">
            <Sidebar />
            <div className="min-w-0 flex-1 space-y-4 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Agent insights</h3>
                <span className="text-white/40" aria-hidden="true">★ &nbsp;•••</span>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                {stats.map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/10 p-4">
                    <p className="text-xs text-white/50">{s.label}</p>
                    <p className="mt-3 text-3xl font-medium tracking-tight tabular-nums">{s.value}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/50">Daily budget</p>
                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <span className="animate-live h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
                    </span>
                  </div>
                  <p className="mt-3 text-xl font-medium tabular-nums">
                    $6,840 <span className="text-sm text-white/40">/ $10,000</span>
                  </p>
                  <div
                    className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuenow={68.4}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Daily budget allocated"
                  >
                    <div className="h-full rounded-full bg-white" style={{ width: "68.4%" }} />
                  </div>
                  <p className="mt-2 text-[11px] text-white/45">68.4% allocated across active runs</p>
                </div>
              </div>

              <BarChart />
              <ProjectsTable />
            </div>
          </div>
        </Window>
      </div>
    </section>
  );
}
