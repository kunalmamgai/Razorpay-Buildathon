# Qronos landing page

React + Vite + Tailwind CSS v4 + Three.js.

## Run it
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in /dist
```

## Where things live
| File | What it is |
| --- | --- |
| `src/components/VortexCanvas.jsx` | The Three.js particle vortex in the hero. Tweak strand counts, funnel shape and opacity at the top of the file. |
| `src/components/Hero.jsx` | Headline, buttons, logo marquee |
| `src/components/LogoMarquee.jsx` | Text wordmarks. Swap for real SVG/PNG logos in `/public/logos`. |
| `src/components/About.jsx` | "Stateful execution" section with the schedule mockup |
| `src/components/Features.jsx` | Bento grid: pipelines, scheduling, guardrails (interactive), inbox |
| `src/components/Insights.jsx` | Dashboard mockup: stats, bar chart, table |
| `src/components/Pricing.jsx` | Monthly/yearly toggle and four plans (edit the `plans` array) |
| `src/components/Testimonials.jsx`, `CTA.jsx`, `Footer.jsx` | The rest |
| `src/components/ui.jsx` | Shared logo, buttons, section heading |

## Making it yours
- Rename "Qronos" and rewrite the copy in each component's data arrays.
- Replace `LogoMark` in `ui.jsx` with your own logo SVG.
- Font is Inter (loaded in `index.html`); change `--font-sans` in `src/index.css`.
