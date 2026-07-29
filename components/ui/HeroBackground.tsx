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
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 h-[400px] overflow-hidden sm:h-[460px]"
    >
      {/* Lager 1 — kolumnlinjer var 160:e px. Dolda på mobil, där de blir för täta. */}
      <div
        className="absolute inset-0 opacity-0 md:opacity-70"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, transparent 0 159px, #EAE7E0 159px 160px)",
          // Linjerna tonar ut mot heronsens botten i stället för att kapas av
          maskImage: "linear-gradient(to bottom, #000 0 62%, transparent 96%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0 62%, transparent 96%)",
        }}
      />
      {/* Lager 2 — svag baslinjekurva förankrad i heronsens botten */}
      <svg
        viewBox="0 0 1280 200"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[120px] w-full md:h-[210px]"
      >
        <defs>
          {/* Areafyllningen tonar ut mot noll nedåt, så bandet inte får en hård
              kant där heron slutar. Kurvans linje lämnas orörd och skarp. */}
          <linearGradient id="hero-curve-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F3A5F" stopOpacity={0.05} />
            <stop offset="55%" stopColor="#1F3A5F" stopOpacity={0.02} />
            <stop offset="100%" stopColor="#1F3A5F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d="M0,170 C220,150 360,110 520,120 C700,132 820,60 1010,64 C1130,66 1210,44 1280,36 L1280,200 L0,200 Z"
          fill="url(#hero-curve-fade)"
        />
        <path
          d="M0,170 C220,150 360,110 520,120 C700,132 820,60 1010,64 C1130,66 1210,44 1280,36"
          fill="none"
          stroke="#1F3A5F"
          strokeWidth={1.5}
          opacity={0.14}
        />
      </svg>
    </div>
  );
}
