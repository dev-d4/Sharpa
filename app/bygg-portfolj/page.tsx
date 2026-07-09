import BuilderClient from "./BuilderClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bygg din portfölj – Sharpa",
  description: "Svara på 5 frågor och se ett illustrativt portföljexempel baserat på valda kriterier och historiska fondnyckeltal.",
};

export default function ByggPortfoljPage() {
  const instanceKey = crypto.randomUUID();
  return <BuilderClient key={instanceKey} />;
}
