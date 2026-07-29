/**
 * Diskret bakgrund för landningssidans hero — och ingen annan vy.
 *
 * Två lager på mycket låg opacitet så typografin fortsatt bär ytan: svaga
 * vertikala kolumnlinjer i hårlinjefärg, och en baslinjekurva i accent.
 * Rent dekorativ, därför aria-hidden och utan träffyta.
 *
 * Höj inte opaciteten och lägg inte till fler färger eller kurvor — då tippar
 * ytan över mot dekorativ SaaS-gradient, vilket är precis det designrevisionen
 * tog bort.
 */
export default function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Lager 1 — kolumnlinjer var 160:e px. Dolda på mobil, där de blir för täta. */}
      <div
        className="absolute inset-0 opacity-0 md:opacity-70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, transparent 0 159px, #EAE7E0 159px 160px)",
        }}
      />
      {/* Lager 2 — svag baslinjekurva förankrad i heronsens botten */}
      <svg
        viewBox="0 0 1280 200"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[120px] w-full md:h-[210px]"
      >
        <path
          d="M0,170 C220,150 360,110 520,120 C700,132 820,60 1010,64 C1130,66 1210,44 1280,36"
          fill="none"
          stroke="#1F3A5F"
          strokeWidth={1.5}
          opacity={0.14}
        />
        <path
          d="M0,170 C220,150 360,110 520,120 C700,132 820,60 1010,64 C1130,66 1210,44 1280,36 L1280,200 L0,200 Z"
          fill="#1F3A5F"
          opacity={0.04}
        />
      </svg>
    </div>
  );
}
