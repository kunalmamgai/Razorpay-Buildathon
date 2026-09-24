/**
 * Text-based wordmarks so the template works out of the box.
 * Swap any of these for real SVG/PNG logos (drop them in /public/logos and use <img>).
 */
const logos = [
  { name: "zapier", cls: "font-semibold tracking-tight text-[1.6rem]" },
  { name: "snowflake", cls: "font-light text-[1.4rem]", icon: "✻" },
  { name: "aws S3", cls: "font-semibold text-[1.5rem]" },
  { name: "stripe", cls: "font-bold tracking-tight text-[1.7rem]", icon: "▪" },
  { name: "Vercel", cls: "font-semibold text-[1.5rem]", icon: "▲" },
  { name: "Google BigQuery", cls: "font-medium text-[1.05rem]", icon: "⬢" },
  { name: "slack", cls: "font-bold text-[1.7rem]", icon: "#" },
  { name: "supabase", cls: "font-medium text-[1.4rem]", icon: "ϟ" },
  { name: "GitHub", cls: "font-semibold text-[1.4rem]", icon: "◉" },
  { name: "HubSpot", cls: "font-semibold text-[1.4rem]" },
];

function Item({ logo }) {
  return (
    <li className={`flex shrink-0 items-center gap-2 px-8 text-white/55 sm:px-10 ${logo.cls}`}>
      {logo.icon && <span aria-hidden="true">{logo.icon}</span>}
      <span>{logo.name}</span>
    </li>
  );
}

export default function LogoMarquee() {
  return (
    <div
      className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
      aria-label="Connected systems"
    >
      <ul className="animate-marquee flex w-max items-center">
        {logos.map((l) => (
          <Item key={l.name} logo={l} />
        ))}
        {logos.map((l) => (
          <Item key={`${l.name}-dup`} logo={l} />
        ))}
      </ul>
    </div>
  );
}
