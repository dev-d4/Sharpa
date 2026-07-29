import { cn } from "@/lib/utils";

/**
 * Delade ytprimitiver för designsystemet.
 *
 * Regeln är ett kortlager: en <Panel> får aldrig innehålla en annan <Panel>.
 * Inre grupper avdelas i stället med <Divider> eller en hårlinje i rutnätet.
 */

export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-md border border-line bg-white", className)} {...rest}>
      {children}
    </section>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("h-px w-full bg-line", className)} />;
}

/**
 * Kortrubrik — står fritt på pappersytan ovanför sitt kort, inte som ett band
 * inuti det. Sätts i den redaktionella serifens kursiv, samma stil som
 * accentorden i landningens rubrik, så rubriknivåerna hänger ihop över sajten.
 */
export function CardTitle({
  title,
  sub,
  className,
}: {
  title: string;
  sub?: string;
  className?: string;
}) {
  return (
    // Ett litet indrag så rubriken inte ligger exakt i kortets ytterkant —
    // avsiktligt bara några pixlar, inte i linje med kortets innerpadding.
    <div className={cn("mb-3 pl-1.5 sm:mb-4 sm:pl-2", className)}>
      <h2 className="font-display text-[22px] italic leading-tight text-ink sm:text-[26px]">
        {title}
      </h2>
      {sub && <p className="mt-1.5 text-sm leading-snug text-ink-3">{sub}</p>}
    </div>
  );
}

/** Versaletikett i mono — används över nyckeltal, sektioner och metadata. */
export function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("label-meta", className)}>{children}</p>;
}

/**
 * Statusprick. Färgen är avsiktligt enfärgad och kompletteras alltid av
 * texten bredvid — färg är aldrig ensam bärare av betydelse.
 */
export function StatusDot({ tone, className }: { tone: "pos" | "warn" | "neg" | "neutral"; className?: string }) {
  const color =
    tone === "pos" ? "bg-pos" : tone === "warn" ? "bg-warn" : tone === "neg" ? "bg-neg" : "bg-ink-3";
  return <span aria-hidden="true" className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", color, className)} />;
}

/** Ett nyckeltal: versaletikett, monovärde med tabulära siffror, underrad. */
export function Stat({
  label,
  value,
  sub,
  className,
  action,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0 px-4 py-5 sm:px-6", className)}>
      <div className="mb-2 flex min-w-0 items-center gap-1">
        <span className="label-meta min-w-0 break-words leading-snug">{label}</span>
        {action}
      </div>
      <p className="figure text-[26px] leading-none text-ink sm:text-[30px]">{value}</p>
      {sub && <p className="mt-2 text-xs text-ink-3">{sub}</p>}
    </div>
  );
}

/**
 * Linjerat nyckeltalsrutnät — hårlinjer i stället för kort-i-kort.
 * 4 kolumner på desktop, 2 på surfplatta, 1 på mobil.
 */
export function MetricGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0",
        "[&>*]:border-line sm:[&>*]:border-b sm:[&>*:nth-child(odd)]:border-r",
        "lg:grid-cols-4 lg:[&>*]:border-b-0 lg:[&>*]:border-r lg:[&>*:last-child]:border-r-0 lg:[&>*:nth-child(odd)]:border-r",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Horisontell andelsstapel i en accent — ersätter donutdiagram där hela
 * portföljen ligger i en eller ett fåtal kategorier. Andelen står i klartext
 * bredvid etiketten, så stapeln aldrig är enda informationsbäraren.
 */
export function ShareBar({
  items,
  className,
}: {
  items: { label: string; weight: number }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 text-sm text-ink-2">{item.label}</span>
            <span className="figure shrink-0 text-sm text-ink">
              {item.weight.toFixed(1).replace(".", ",")} %
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full bg-fill-muted">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.max(0, Math.min(100, item.weight))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
