// Samma beräkningsmodell som avgiftskalkylatorn i components/ui/HowItWorks.tsx.
// Håll dem i synk — siffrorna i videorna måste stämma med sajtens, annars kan vi
// inte stå för dem i marknadsföring där vi namnger faktiska fonder.

export const CAPITAL = 200_000;
export const GROSS_RETURN = 8.0;
export const TARGET_FEE = 0.15;
export const YEARS = 10;

export type FeeGap = {
  /** Slutvärde med fondens faktiska avgift. */
  endValue: number;
  /** Slutvärde med en optimerad avgift på TARGET_FEE. */
  endValueOptimised: number;
  /** Positivt tal: så mycket mer du hade haft med den billiga avgiften. */
  gap: number;
  /** Årsvis serie för respektive kurva, år 0…YEARS (längd YEARS + 1). */
  expensiveSeries: number[];
  cheapSeries: number[];
};

function series(netReturn: number): number[] {
  return Array.from({ length: YEARS + 1 }, (_, year) =>
    CAPITAL * Math.pow(1 + netReturn / 100, year),
  );
}

export function calculateFeeGap(fee: number): FeeGap {
  const net = GROSS_RETURN - fee;
  const netOptimised = GROSS_RETURN - TARGET_FEE;
  const expensiveSeries = series(net);
  const cheapSeries = series(netOptimised);
  const endValue = expensiveSeries[YEARS];
  const endValueOptimised = cheapSeries[YEARS];

  return {
    endValue,
    endValueOptimised,
    gap: endValueOptimised - endValue,
    expensiveSeries,
    cheapSeries,
  };
}
