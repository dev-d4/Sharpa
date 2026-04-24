import BuilderClient from "./BuilderClient";

export const metadata = {
  title: "Bygg din portfölj – Fondanalys",
  description: "Svara på 5 frågor och få en komplett fondportfölj anpassad efter dina mål, tidshorisont och risktolerans.",
};

export default function ByggPortfoljPage() {
  return <BuilderClient />;
}
