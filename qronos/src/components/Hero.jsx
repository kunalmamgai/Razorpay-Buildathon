import VortexCanvas from "./VortexCanvas.jsx";
import LogoMarquee from "./LogoMarquee.jsx";
import { Button } from "./ui.jsx";

export default function Hero() {
  return (
    <section id="top" className="relative isolate min-h-[100svh] overflow-hidden bg-black">
      <VortexCanvas className="absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-linear-to-t from-black via-black/60 to-transparent" />

      <div className="mx-auto flex min-h-[100svh] max-w-[1500px] flex-col items-center justify-center px-6 pb-44 pt-32 text-center">
        <h1 className="animate-rise text-[clamp(2.6rem,6.4vw,5.75rem)] font-medium leading-[0.98] tracking-[-0.05em]">
          <span className="block text-white sm:whitespace-nowrap">The schedule management</span>
          <span className="block bg-linear-to-b sm:whitespace-nowrap from-white to-white/30 bg-clip-text pb-[0.12em] text-transparent">
            system for autonomous agents
          </span>
        </h1>

        <p className="animate-rise mt-8 max-w-xl text-[1.05rem] leading-8 text-white [text-shadow:0_0_18px_#000,0_0_6px_#000] [animation-delay:120ms] sm:text-lg">
          Coordinate work across every system, trigger, and agent.
          <br className="hidden sm:block" /> Durable context keeps every run informed and in control.
        </p>

        <div className="animate-rise mt-10 flex flex-wrap items-center justify-center gap-4 [animation-delay:240ms]">
          <Button href="#pricing" chevrons>
            Get started
          </Button>
          <Button href="#pricing" variant="solid">
            Request a demo
          </Button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-8">
        <LogoMarquee />
      </div>
    </section>
  );
}
