import { SectionHeading } from "./ui.jsx";

const items = [
  {
    company: "Meridian",
    quote:
      "Qronos gave our research agents a dependable rhythm. Every brief starts with the context and tools from the run before it.",
    name: "Moustachia Balding",
    role: "CTO, Meridian Labs",
    initials: "MB",
    stats: ["80% of recurring intelligence automated", "One durable run history for every agent"],
  },
  {
    company: "Monolyth",
    quote:
      "We replaced brittle polling jobs with agents that wake on real signals, follow through, and stay inside the budget we set.",
    name: "Dani Raulisa",
    role: "VP Engineering, Monolyth Dev",
    initials: "DR",
    stats: ["10× faster response to customer events", "0 missed handoffs across active workflows"],
  },
];

export default function Testimonials() {
  return (
    <section id="customers" className="scroll-mt-20 bg-black px-5 py-24 sm:px-10 sm:py-32">
      <SectionHeading
        lead="Teams moving faster"
        tail="with autonomous work."
        sub="See how operations teams turn recurring work into agent-led systems that stay responsive, governed, and in context."
      />

      <div className="mx-auto mt-16 grid max-w-6xl gap-5 md:grid-cols-2">
        {items.map((t) => (
          <figure key={t.name} className="flex flex-col rounded-2xl border border-white/10 bg-neutral-950 p-8">
            <p className="text-xl font-semibold tracking-tight text-white/70">{t.company}</p>
            <blockquote className="mt-8 flex-1 text-xl leading-9 tracking-tight text-white sm:text-2xl sm:leading-10">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-8 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-sm font-medium">
                {t.initials}
              </span>
              <span>
                <span className="block font-medium">{t.name}</span>
                <span className="block text-sm text-white/50">{t.role}</span>
              </span>
            </figcaption>
            <ul className="mt-8 space-y-2 border-t border-white/10 pt-6 text-white/65">
              {t.stats.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </figure>
        ))}
      </div>
    </section>
  );
}
