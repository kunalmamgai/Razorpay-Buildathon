import { useState } from "react";
import { SectionHeading, Button } from "./ui.jsx";

const check = (
  <svg viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="m3 8.5 3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const plans = [
  {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    unit: "/ month",
    blurb: "For exploring dependable autonomous work.",
    cta: "Get Started",
    lead: "Includes",
    features: [
      "3 active agent jobs",
      "1,000 runs per month",
      "Durable run history",
      "One team member",
      "Standard wake-up rules",
      "Community support",
    ],
  },
  {
    name: "Basic",
    monthly: 24,
    yearly: 19,
    unit: "/ month",
    blurb: "For growing workflows and lightweight team operations.",
    cta: "Get Started",
    lead: "All Starter features +",
    features: [
      "10 active agent jobs",
      "10,000 runs per month",
      "Scheduled and webhook wake-ups",
      "Shared workspace",
      "Seven-day execution logs",
      "Email support",
    ],
  },
  {
    name: "Team",
    monthly: 19,
    yearly: 15,
    unit: "/ seat / month",
    blurb: "For teams putting recurring operations on autopilot.",
    cta: "Get Started",
    featured: true,
    lead: "All Basic features +",
    features: [
      "25 active agent jobs",
      "50,000 runs per month",
      "Shared workspaces and audit trails",
      "Priority support",
      "Custom scheduling rules",
      "Ten team members",
      "Full execution logs",
      "Budget caps and safeguards",
      "Private tool access",
    ],
  },
  {
    name: "Enterprise",
    custom: true,
    blurb: "For production systems with dedicated safeguards.",
    cta: "Contact Sales",
    lead: "All Team features +",
    features: [
      "Unlimited active agent jobs",
      "Private deployment options",
      "Custom wake-up policies",
      "Dedicated support and SLA",
      "Single sign-on and role controls",
      "Unlimited execution history",
      "Advanced budget governance",
      "Dedicated runtime capacity",
      "Onboarding and solution design",
    ],
  },
];

function Toggle({ yearly, onChange }) {
  const opt = (label, value) => (
    <button
      type="button"
      role="radio"
      aria-checked={yearly === value}
      onClick={() => onChange(value)}
      className={`rounded-full px-5 py-2 text-sm transition-colors ${
        yearly === value ? "bg-white text-black" : "text-white/65 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full border border-white/15 p-1">
        {opt("Monthly", false)}
        {opt("Yearly", true)}
      </div>
      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Save 20%</span>
    </div>
  );
}

export default function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="scroll-mt-20 bg-black px-5 py-24 sm:px-10 sm:py-32">
      <SectionHeading
        lead="Pricing that grows"
        tail="with your agents."
        sub="Start small, then scale reliable autonomous work across every operation."
      />
      <Toggle yearly={yearly} onChange={setYearly} />

      <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => {
          const price = yearly ? p.yearly : p.monthly;
          return (
            <article
              key={p.name}
              className={`flex flex-col rounded-2xl border p-7 ${
                p.featured ? "border-white/60 bg-white/[0.05]" : "border-white/10 bg-neutral-950"
              }`}
            >
              <h3 className="text-lg font-medium">{p.name}</h3>

              <p className="mt-5 flex items-baseline gap-1.5">
                {p.custom ? (
                  <span className="text-4xl font-medium tracking-tight">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-medium tracking-tight tabular-nums">${price}</span>
                    <span className="text-sm text-white/50">{p.unit}</span>
                  </>
                )}
              </p>
              <p className="mt-3 min-h-12 text-sm leading-6 text-white/55">{p.blurb}</p>

              <Button href="#" variant={p.featured ? "solid" : "ghost"} className="mt-6 w-full">
                {p.cta}
              </Button>

              <ul className="mt-7 space-y-3 border-t border-white/10 pt-6 text-sm text-white/75">
                {p.lead && <li className="text-white/45">{p.lead}</li>}
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    {check}
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
