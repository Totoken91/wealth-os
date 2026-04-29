export default function Home() {
  return (
    <main className="relative z-10 mx-auto max-w-[1100px] px-6 py-16 text-blueberry-900">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-blueberry-800/80">
        ◆ Wealth OS
      </div>
      <h1 className="mt-2 font-sans text-5xl font-extralight tracking-tight">
        Palier A — boot OK
      </h1>
      <p className="mt-3 max-w-xl text-sm text-blueberry-800/80">
        Scaffold Next.js 14, palette iMac G3 et fonts Inter + JetBrains Mono
        chargées. Background bondi avec bulles fruitées actif.
      </p>

      <div className="mt-8 flex gap-3">
        <span className="h-6 w-6 rounded-md border border-black/30 bg-gradient-to-b from-blueberry-100 to-blueberry-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.15)]" />
        <span className="h-6 w-6 rounded-md border border-black/30 bg-gradient-to-b from-tangerine-100 to-tangerine-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.15)]" />
        <span className="h-6 w-6 rounded-md border border-black/30 bg-gradient-to-b from-lime-100 to-lime-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.15)]" />
        <span className="h-6 w-6 rounded-md border border-black/30 bg-gradient-to-b from-strawberry-100 to-strawberry-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.15)]" />
        <span className="h-6 w-6 rounded-md border border-black/30 bg-gradient-to-b from-grape-100 to-grape-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.15)]" />
        <span className="h-6 w-6 rounded-md border border-black/30 bg-gradient-to-b from-bondi-100 to-bondi-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_2px_rgba(0,0,0,0.15)]" />
      </div>
    </main>
  );
}
