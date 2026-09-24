import { Logo } from "./ui.jsx";

const columns = [
  {
    title: "Product",
    links: [
      ["Scheduling patterns", "#features"],
      ["How scheduling works", "#features"],
      ["Pricing", "#pricing"],
      ["Connected systems", "#top"],
    ],
  },
  {
    title: "Developers",
    links: [
      ["Documentation", "#"],
      ["Scheduler SDK", "#"],
      ["API Reference", "#"],
      ["Status", "#"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "#about"],
      ["Blog", "#"],
      ["Careers", "#"],
      ["Contact", "#"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "#"],
      ["Terms", "#"],
      ["Security", "#"],
    ],
  },
];

const socials = ["Twitter", "GitHub", "LinkedIn"];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black px-5 pb-10 pt-16 sm:px-10">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/55">
            AI agent scheduling with durable state. Automate recurring work across every tool, trigger, and run.
          </p>
          <ul className="mt-6 flex gap-5 text-sm text-white/70">
            {socials.map((s) => (
              <li key={s}>
                <a href="#" className="transition-colors hover:text-white">
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="text-sm font-medium">{c.title}</h3>
            <ul className="mt-4 space-y-3 text-sm text-white/55">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="transition-colors hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-16 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/45">
        <p>© {new Date().getFullYear()} Qronos. All rights reserved.</p>
        <p className="flex items-center gap-2">
          <span className="animate-live h-2 w-2 rounded-full bg-emerald-400" />
          All scheduler systems operational
        </p>
      </div>
    </footer>
  );
}
