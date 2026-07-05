import BuilderClient from "./BuilderClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bygg din portfölj – Sharpa",
  description: "Svara på 5 frågor och få en komplett fondportfölj anpassad efter dina mål, tidshorisont och risktolerans.",
};

export default function ByggPortfoljPage() {
  const instanceKey = crypto.randomUUID();
  return <BuilderClient key={instanceKey} />;
}
