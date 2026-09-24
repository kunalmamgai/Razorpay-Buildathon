import { useState } from "react";
import { SectionHeading, LiveBadge } from "./ui.jsx";

/* ---------- shared bits ---------- */

function Card({ title, body, className = "", children }) {
  return (
    <article className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 ${className}`}>
      <div className="flex-1 p-5 sm:p-6">{children}</div>
      <div className="border-t border-white/10 p-5 sm:p-6">
        <h3 className="text-xl font-medium tracking-tight">{title}</h3>
        <p className="mt-2 max-w-md text-white/55">{body}</p>
      </div>
    </article>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-xl font-medium">{value}</p>
    </div>
  );
}

/* ---------- multi-agent pipeline ---------- */

function Connector() {
  return (
    <div className="relative mx-auto h-9 w-px bg-white/20" aria-hidden="true">
      <span className="animate-travel absolute -left-[2px] top-0 h-1.5 w-1.5 rounded-full bg-white" />
    </div>
  );
}

function Node({ label, title, sub }) {
  return (
    <div className="mx-auto w-full max-w-xs rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{title}</p>
      <p className="text-xs text-white/50">{sub}</p>
    </div>
  );
}

function Pipeline() {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
        <span className="flex items-center gap-2 uppercase tracking-wide">
          Multi-agent pipeline <LiveBadge />
        </span>
        <span>3 agents · 0 errors</span>
      </div>

      <div className="mt-6">
        <Node label="Trigger" title="Daily brief" sub="cron · webhook" />
        <Connector />
        <Node label="Shared context" title="Memory loaded" sub="tools + history" />
        <Connector />
        <Node label="Orchestrator" title="Routing work" sub="handoffs active" />
        <div className="mx-auto h-5 w-px bg-white/20" />
        <div className="mx-auto h-px w-[82%] bg-white/20" />
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {["Research agent", "Support agent", "Finance agent"].map((a) => (
            <li key={a} className="rounded-lg border border-white/15 bg-white/[0.05] px-2 py-2 text-center text-xs text-white/80">
              {a}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 rounded-lg bg-white/[0.06] px-3 py-2 text-sm text-white/60">
        Received: “Prepare the daily operations brief…”
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
        <Stat label="Runs today" value="1,247" />
        <Stat label="Success" value="99.9%" />
        <Stat label="Handoffs" value="342ms" />
      </div>
    </div>
  );
}

/* ---------- flexible scheduling ---------- */

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const jobs = [
  { name: "Daily intelligence", trigger: "Cron · 08:30", start: 1, span: 6 },
  { name: "Lead response", trigger: "Webhook", start: 2, span: 4 },
  { name: "Memory maintenance", trigger: "Adaptive", start: 4, span: 4 },
];

function Scheduling() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">Schedule</p>
          <p className="text-xs text-white/45">Next 7 days</p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70">12 queued</span>
      </div>

      <div className="mt-5 grid grid-cols-7 text-xs text-white/40">
        {days.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="mt-2 space-y-3">
        {jobs.map((j) => (
          <div key={j.name} className="grid grid-cols-7">
            <div
              className="flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/[0.07] px-3 py-2"
              style={{ gridColumn: `${j.start} / span ${Math.min(j.span, 8 - j.start)}` }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{j.name}</p>
                <p className="text-[11px] uppercase tracking-wide text-white/45">{j.trigger}</p>
              </div>
              <LiveBadge />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
        <Stat label="Trigger types" value="3" />
        <Stat label="Run reliability" value="99.99%" />
      </div>
    </div>
  );
}

/* ---------- guardrails (interactive) ---------- */

const policies = ["Require approval", "Monitor", "Block"];

function Guardrails() {
  const [policy, setPolicy] = useState("Require approval");

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 p-4">
        <div>
          <p className="text-sm font-medium">Daily API budget</p>
          <p className="text-xs text-white/50">Prevent runaway model spend</p>
        </div>
        <span className="rounded-md bg-white/10 px-2 py-1 text-xs">$250 / day</span>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 p-4">
        <div>
          <p className="text-sm font-medium">Run timeout</p>
          <p className="text-xs text-white/50">Stop stalled agent jobs</p>
        </div>
        <span className="rounded-md bg-white/10 px-2 py-1 text-xs">15 min</span>
      </div>

      <div className="rounded-xl border border-white/10 p-4">
        <p className="text-sm font-medium">Sensitive tools</p>
        <p className="text-xs text-white/50">Hold destructive actions</p>
        <div role="radiogroup" aria-label="Sensitive tools policy" className="mt-3 flex flex-wrap gap-2">
          {policies.map((p) => {
            const active = p === policy;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPolicy(p)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  active ? "border-white bg-white text-black" : "border-white/20 text-white/70 hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- inbox ---------- */

const inbox = [
  { who: "RA", title: "Research brief ready", sub: "Research agent completed the competitor scan", time: "8m" },
  { who: "SA", title: "Approval required", sub: "Support agent wants to issue a refund", time: "1h" },
  { who: "FA", title: "Budget threshold reached", sub: "Finance agent paused the nightly run", time: "4h" },
  { who: "OA", title: "Memory sync complete", sub: "Ops agent saved context for its next wake-up", time: "1d" },
];

function Inbox() {
  return (
    <div>
      <p className="mb-3 text-sm font-medium">Inbox</p>
      <ul className="divide-y divide-white/10">
        {inbox.map((m) => (
          <li key={m.title} className="flex items-center gap-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-xs font-medium">
              {m.who}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.title}</p>
              <p className="truncate text-xs text-white/50">{m.sub}</p>
            </div>
            <span className="text-xs text-white/40">{m.time}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- section ---------- */

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-black px-5 py-24 sm:px-10 sm:py-32">
      <SectionHeading
        lead="Durable autonomy."
        tail="Every run resumes in context."
        sub="Qronos gives autonomous agents durable context, flexible execution, and controls built for production."
      />

      <div className="mx-auto mt-16 grid max-w-6xl gap-5 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          title="Multi-Agent Pipelines"
          body="Coordinate specialized agents with shared context, tools, and handoffs in one durable run."
        >
          <Pipeline />
        </Card>
        <Card
          className="lg:col-span-2"
          title="Flexible scheduling"
          body="Start work on a cron, a webhook, a system event, or an agent-selected wake-up."
        >
          <Scheduling />
        </Card>
        <Card
          className="lg:col-span-2"
          title="Built-in guardrails"
          body="Budget caps and strict timeouts keep autonomous work focused, bounded, and safe."
        >
          <Guardrails />
        </Card>
        <Card
          className="lg:col-span-3"
          title="Agent Inbox"
          body="Review completed work, approval requests, and agent alerts in one focused queue."
        >
          <Inbox />
        </Card>
      </div>
    </section>
  );
}
