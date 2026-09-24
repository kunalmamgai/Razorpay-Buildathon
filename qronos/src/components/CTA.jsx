import { Button } from "./ui.jsx";

export default function CTA() {
  return (
    <section className="relative isolate overflow-hidden bg-black px-5 py-32 text-center sm:px-10 sm:py-44">
      {/* quiet echo of the hero: concentric rings that fade out */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-10 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 opacity-40 [background:repeating-radial-gradient(circle,rgba(255,255,255,0.14)_0_1px,transparent_1px_16px)] [mask-image:radial-gradient(circle,black_0%,transparent_55%)]"
      />
      <h2 className="mx-auto max-w-4xl text-[clamp(2.4rem,6vw,4.75rem)] font-medium leading-[1.02] tracking-[-0.045em]">
        <span className="block">Stop babysitting agents.</span>
        <span className="block text-white/45">Let them own the work.</span>
      </h2>
      <p className="mx-auto mt-6 max-w-lg text-lg text-white/60">
        Turn every recurring task, signal, and handoff into reliable work that carries its context forward.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button href="#pricing" chevrons>
          Get started
        </Button>
        <Button href="#pricing" variant="solid">
          Request a demo
        </Button>
      </div>
    </section>
  );
}
