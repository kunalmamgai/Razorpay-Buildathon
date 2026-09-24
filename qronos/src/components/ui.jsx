export function LogoMark({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M2 2h19l-7.5 8.5H9V21h4.5L9.5 30H2z" />
      <path d="M30 30H13l7.5-8.5H23V11h-4l4-9h7z" />
    </svg>
  );
}

export function Logo({ className = "" }) {
  return (
    <a href="#top" className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Qronos home">
      <LogoMark />
      <span className="text-[1.05rem] font-semibold tracking-[0.03em]">QRONOS</span>
    </a>
  );
}

export function Chevrons({ className = "h-3.5 w-3.5" }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="m3 3 5 5-5 5M8 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium uppercase tracking-tight transition-colors duration-200";

const variants = {
  outline: "border border-white/30 bg-black/50 text-white backdrop-blur hover:bg-white/10",
  solid: "bg-white text-black hover:bg-white/85",
  ghost: "border border-white/15 text-white hover:bg-white/10",
};

const sizes = {
  md: "px-6 py-3",
  sm: "px-5 py-2.5",
};

export function Button({ href = "#", variant = "outline", size = "md", chevrons = false, className = "", children, ...rest }) {
  return (
    <a href={href} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest}>
      {children}
      {chevrons && <Chevrons />}
    </a>
  );
}

export function SectionHeading({ lead, tail, sub, className = "" }) {
  return (
    <div className={`mx-auto max-w-5xl text-center ${className}`}>
      <h2 className="text-[clamp(2.25rem,5.2vw,3.9rem)] font-medium leading-[1.02] tracking-[-0.04em]">
        <span className="block text-white sm:whitespace-nowrap">{lead}</span>
        <span className="block text-white/45 sm:whitespace-nowrap">{tail}</span>
      </h2>
      {sub && <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">{sub}</p>}
    </div>
  );
}

/** Frame used for the product mockups */
export function Window({ className = "", children }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 ${className}`}>{children}</div>
  );
}

export function LiveBadge({ children = "Live" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-300">
      <span className="animate-live h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {children}
    </span>
  );
}
