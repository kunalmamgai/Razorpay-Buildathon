import { useState } from "react";
import { Logo, Button } from "./ui.jsx";

const links = [
  { label: "About", href: "#about" },
  { label: "Features", href: "#features" },
  { label: "Insights", href: "#insights" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#customers" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-md">
      <nav className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-5 sm:px-10" aria-label="Main">
        <Logo />

        <ul className="hidden items-center gap-10 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-[0.95rem] text-white/80 transition-colors hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Button href="#pricing" size="sm" chevrons className="hidden sm:inline-flex">
            Get started
          </Button>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/20 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              {open ? <path d="m4 4 12 12M16 4 4 16" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-white/10 bg-black/95 px-5 pb-6 pt-2 md:hidden">
          <ul className="flex flex-col">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-white/10 py-4 text-lg text-white/85"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <Button href="#pricing" chevrons className="mt-6 w-full" onClick={() => setOpen(false)}>
            Get started
          </Button>
        </div>
      )}
    </header>
  );
}
