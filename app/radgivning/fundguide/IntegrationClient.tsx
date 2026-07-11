"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Copy, ExternalLink, Plus, X } from "lucide-react";
import { encodePayload } from "@/lib/report-url";

// ── URL builder ───────────────────────────────────────────────────────────────

type FundRow = { isin: string; weight: string };

function buildUrl(
  custodian: string,
  funds: FundRow[],
  amount: string,
  client: string,
  comment: string,
): string {
  const valid = funds
    .filter(f => f.isin.trim() && parseFloat(f.weight) > 0)
    .map(f => ({ isin: f.isin.trim().toUpperCase(), weight: parseFloat(f.weight) }));
  if (!valid.length) return "";
  const payload: Record<string, unknown> = { custodian, funds: valid };
  if (parseFloat(amount) > 0) payload.amount = parseFloat(amount);
  if (client.trim())  payload.client  = client.trim();
  if (comment.trim()) payload.comment = comment.trim();
  return `/rapport?p=${encodePayload(payload)}`;
}

// ── Code examples ─────────────────────────────────────────────────────────────

const TS_CODE = `function buildRapportUrl(params: {
  custodian: "avanza" | "nordnet" | "övrigt";
  funds:     { isin: string; weight: number }[];
  amount?:   number;
  client?:   string;
  comment?:  string;
}): string {
  // Buffer.from hanterar UTF-8 korrekt (fungerar för Å Ä Ö i kundnamn)
  const p = Buffer.from(JSON.stringify(params)).toString("base64");
  return \`https://er-domän.se/rapport?p=\${p}\`;
}

// Anrop
const url = buildRapportUrl({
  custodian: "avanza",
  amount:    850_000,
  client:    "Anna Svensson",
  funds: [
    { isin: "SE0015382114", weight: 70 },
    { isin: "SE0000813933", weight: 30 },
  ],
});`;

const PY_CODE = `import json, base64

def build_rapport_url(
    custodian: str,
    funds: list[dict],
    amount: float | None = None,
    client: str | None = None,
    comment: str | None = None,
) -> str:
    payload = {"custodian": custodian, "funds": funds}
    if amount:  payload["amount"]  = amount
    if client:  payload["client"]  = client
    if comment: payload["comment"] = comment

    p = base64.b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).decode()
    return f"https://er-domän.se/rapport?p={p}"

# Anrop
url = build_rapport_url(
    custodian="avanza",
    amount=850_000,
    client="Anna Svensson",
    funds=[
        {"isin": "SE0015382114", "weight": 70},
        {"isin": "SE0000813933", "weight": 30},
    ],
)`;

const CURL_CODE = `# Bygg payload med Python (eller valfritt verktyg)
PAYLOAD=$(python3 -c "
import json, base64
d = {
  'custodian': 'avanza',
  'amount': 850000,
  'client': 'Anna Svensson',
  'funds': [
    {'isin': 'SE0015382114', 'weight': 70},
    {'isin': 'SE0000813933', 'weight': 30}
  ]
}
print(base64.b64encode(json.dumps(d, separators=(',',':')).encode()).decode())
")

# Öppna i webbläsaren
open "https://er-domän.se/rapport?p=$PAYLOAD"`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
        copied
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Kopierat" : "Kopiera"}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "1",
    title: "Hämta portföljdata",
    body: "Läs av kundens innehav från ert system — ISIN-koder och vikter. Lägg eventuellt till belopp, klientnamn och rådgivarkommentar.",
  },
  {
    n: "2",
    title: "Generera URL",
    body: "En enda funktion serialiserar parametrarna till base64 och bygger URL:en. Ingen server, ingen API-nyckel, ingen latens.",
  },
  {
    n: "3",
    title: "Rådgivaren klickar",
    body: "Länken öppnas direkt i webbläsaren. En interaktiv rapport genereras på sekunder med nyckeltal, bytesförslag och tidssimulator.",
  },
];

const FEATURES = [
  "Nyckeltal — avgift, avkastning 1/3 år, Sharpe",
  "Tillgångsfördelning med donut-chart",
  "Förvaltningsstil — aktiv vs passiv",
  "Optimeringsförslag med Acceptera-funktion",
  "Avgiftsräknare i kronor",
  "Tidssimulator (3–15 år)",
  "Fondguide — jämför fonder sida vid sida",
  "Scenarioanalys — redigera portföljen live",
  "PDF-export",
  "Kundvy (skrivskyddad) via ?kund=1",
];

export default function IntegrationClient() {
  // Demo builder state
  const [custodian, setCustodian]   = useState("avanza");
  const [client,    setClient]      = useState("Anna Svensson");
  const [amount,    setAmount]      = useState("850000");
  const [comment,   setComment]     = useState("");
  const [funds, setFunds] = useState<FundRow[]>([
    { isin: "SE0005188836", weight: "40" },
    { isin: "SE0014262788", weight: "20" },
    { isin: "SE0001718388", weight: "30" },
    { isin: "LU0365089902", weight: "10" },
  ]);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [codeTab, setCodeTab]     = useState<"ts" | "py" | "sh">("ts");

  const url = buildUrl(custodian, funds, amount, client, comment);
  const fullUrl = typeof window !== "undefined" ? window.location.origin + url : url;

  function copyUrl() {
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }

  function addFund()                { setFunds(p => [...p, { isin: "", weight: "" }]); }
  function removeFund(i: number)    { setFunds(p => p.filter((_, idx) => idx !== i)); }
  function setIsin(i: number, v: string)   { setFunds(p => p.map((f, idx) => idx === i ? { ...f, isin: v } : f)); }
  function setWeight(i: number, v: string) { setFunds(p => p.map((f, idx) => idx === i ? { ...f, weight: v } : f)); }

  const totalWeight = funds.reduce((s, f) => s + (parseFloat(f.weight) || 0), 0);

  const CODE = { ts: TS_CODE, py: PY_CODE, sh: CURL_CODE }[codeTab];
  const CODE_LANG = { ts: "TypeScript", py: "Python", sh: "Shell" }[codeTab];

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 border border-slate-200 bg-white px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              B2B Integration · Rådgivningsplattformar
            </div>

            <div>
              <h1
                className="text-[40px] sm:text-[52px] leading-[1.06] tracking-[-0.02em] text-slate-900 mb-5"
                style={{ fontFamily: "var(--font-dm-serif)" }}
              >
                Portföljanalys som<br />en länk
              </h1>
              <p className="text-base sm:text-lg text-slate-500 leading-loose max-w-[420px]">
                Integrera interaktiva portföljrapporter i ert rådgivningssystem utan backend,
                utan API-nyckel — med en enda funktion och en URL.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#demo"
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-500/25 hover:-translate-y-0.5"
              >
                Prova demo
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </a>
              <a
                href="#kod"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm transition-all hover:-translate-y-0.5"
              >
                Se kod →
              </a>
            </div>
          </div>

          {/* Right — terminal preview */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-amber-400/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              <span className="ml-2 text-xs text-slate-500 font-mono">rapport_url.ts</span>
            </div>
            <div className="p-5 font-mono text-xs sm:text-sm leading-[1.8] overflow-x-auto">
              <p><span className="text-blue-400">const</span> <span className="text-white">url</span> <span className="text-slate-400">=</span> <span className="text-emerald-400">buildRapportUrl</span><span className="text-slate-400">({"{"}</span></p>
              <p className="pl-4"><span className="text-amber-300">custodian</span><span className="text-slate-400">:</span> <span className="text-emerald-300">&quot;avanza&quot;</span><span className="text-slate-400">,</span></p>
              <p className="pl-4"><span className="text-amber-300">amount</span><span className="text-slate-400">:</span> <span className="text-purple-300">850_000</span><span className="text-slate-400">,</span></p>
              <p className="pl-4"><span className="text-amber-300">client</span><span className="text-slate-400">:</span> <span className="text-emerald-300">&quot;Anna Svensson&quot;</span><span className="text-slate-400">,</span></p>
              <p className="pl-4"><span className="text-amber-300">funds</span><span className="text-slate-400">: [</span></p>
              <p className="pl-8"><span className="text-slate-400">{"{ "}</span><span className="text-amber-300">isin</span><span className="text-slate-400">:</span> <span className="text-emerald-300">&quot;SE0015382114&quot;</span><span className="text-slate-400">, </span><span className="text-amber-300">weight</span><span className="text-slate-400">:</span> <span className="text-purple-300">70</span> <span className="text-slate-400">{"},"}</span></p>
              <p className="pl-8"><span className="text-slate-400">{"{ "}</span><span className="text-amber-300">isin</span><span className="text-slate-400">:</span> <span className="text-emerald-300">&quot;SE0000813933&quot;</span><span className="text-slate-400">, </span><span className="text-amber-300">weight</span><span className="text-slate-400">:</span> <span className="text-purple-300">30</span> <span className="text-slate-400">{"}"}</span></p>
              <p className="pl-4"><span className="text-slate-400">],</span></p>
              <p><span className="text-slate-400">{"});"}</span></p>
              <p className="mt-3 text-slate-500">{"// → "}<span className="text-slate-400">https://er-domän.se/rapport?p=eyJjd...</span></p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Steps ───────────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex gap-5">
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.n}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1.5">{s.title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive demo ─────────────────────────────────────────────────── */}
      <section id="demo" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Interaktiv demo</p>
          <h2
            className="text-3xl sm:text-4xl text-slate-900"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            Bygg en URL
          </h2>
          <p className="text-slate-500 text-sm mt-2 max-w-xl">
            Fyll i parametrarna nedan och se URL:en genereras i realtid. Klicka &ldquo;Öppna rapport&rdquo; för att se resultatet.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">

          {/* Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-6">

            {/* Meta */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Plattform</label>
                <select
                  value={custodian}
                  onChange={e => setCustodian(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="avanza">Avanza</option>
                  <option value="nordnet">Nordnet</option>
                  <option value="övrigt">Övrigt</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Klientnamn <span className="text-slate-400 normal-case font-normal">(valfri)</span></label>
                <input
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  placeholder="Anna Svensson"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Belopp kr <span className="text-slate-400 normal-case font-normal">(valfri)</span></label>
                <input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  type="number"
                  placeholder="850000"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Rådgivarkommentar <span className="text-slate-400 normal-case font-normal">(valfri)</span></label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={2}
                placeholder="Visas som en signerad kommentar i rapporten..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Funds */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fonder (ISIN + vikt)</label>
                <span className={cn("text-xs font-semibold", Math.abs(totalWeight - 100) < 0.1 ? "text-emerald-600" : "text-amber-500")}>
                  Summa: {totalWeight.toFixed(1)}%
                </span>
              </div>
              <div className="hidden sm:grid grid-cols-[1fr_100px_36px] gap-2 px-1 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                <span>ISIN</span><span className="text-right">Vikt %</span><span />
              </div>
              <div className="space-y-2">
                {funds.map((f, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_36px] gap-2 items-center">
                    <input
                      value={f.isin}
                      onChange={e => setIsin(i, e.target.value)}
                      placeholder="SE0000000000"
                      className="font-mono text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase placeholder-slate-300"
                    />
                    <input
                      value={f.weight}
                      onChange={e => setWeight(i, e.target.value)}
                      type="number" min={0} max={100} step={0.1}
                      placeholder="0"
                      className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-right font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeFund(i)}
                      disabled={funds.length <= 1}
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 disabled:opacity-20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addFund}
                className="flex items-center gap-1.5 text-sm font-medium text-blue-500 hover:text-blue-700 transition-colors mt-1"
              >
                <Plus className="w-4 h-4" />
                Lägg till fond
              </button>
            </div>
          </div>

          {/* URL output */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="bg-slate-900 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-xs text-slate-500 font-mono">Genererad URL</span>
                {url && <CopyButton text={fullUrl} />}
              </div>
              <div className="p-4 min-h-[80px] flex items-start">
                {url ? (
                  <p className="font-mono text-xs text-emerald-400 break-all leading-relaxed">
                    <span className="text-slate-500">{typeof window !== "undefined" ? window.location.origin : ""}</span>
                    <span className="text-emerald-400">/rapport?p=</span>
                    <span className="text-slate-300">{url.replace("/rapport?p=", "")}</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 italic">Fyll i minst en fond med vikt...</p>
                )}
              </div>
            </div>

            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-500/25 hover:-translate-y-0.5"
              >
                <ExternalLink className="w-4 h-4" />
                Öppna rapport
              </a>
            )}

            {/* Parameter reference */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parametrar</p>
              {[
                { p: "custodian",  type: "string",   req: true,  desc: '"avanza" | "nordnet" | "övrigt"' },
                { p: "funds",      type: "array",    req: true,  desc: "[{isin, weight}]" },
                { p: "amount",     type: "number",   req: false, desc: "Portföljvärde i SEK" },
                { p: "client",     type: "string",   req: false, desc: "Klientens namn" },
                { p: "comment",    type: "string",   req: false, desc: "Rådgivarens kommentar" },
              ].map(row => (
                <div key={row.p} className="flex items-start gap-3 text-xs">
                  <code className="text-blue-600 font-mono shrink-0 w-20">{row.p}</code>
                  <code className="text-slate-400 font-mono shrink-0 w-12">{row.type}</code>
                  <span className={cn("shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded", row.req ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400")}>
                    {row.req ? "KRÄVS" : "OPT"}
                  </span>
                  <span className="text-slate-500 leading-tight">{row.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Code examples ────────────────────────────────────────────────────── */}
      <section id="kod" className="border-t border-slate-100 bg-slate-50/60 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Kodexempel</p>
            <h2
              className="text-3xl sm:text-4xl text-slate-900"
              style={{ fontFamily: "var(--font-dm-serif)" }}
            >
              Fungerar i alla stackar
            </h2>
          </div>

          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
            {/* Tabs */}
            <div className="flex items-center gap-1 px-4 pt-4 border-b border-white/10">
              {(["ts", "py", "sh"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setCodeTab(t)}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors",
                    codeTab === t
                      ? "bg-white/10 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {{ ts: "TypeScript", py: "Python", sh: "Shell" }[t]}
                </button>
              ))}
              <div className="ml-auto pb-2">
                <CopyButton text={CODE} />
              </div>
            </div>
            {/* Code */}
            <pre className="p-6 text-xs sm:text-sm font-mono text-slate-300 leading-[1.8] overflow-x-auto whitespace-pre">
              {CODE}
            </pre>
          </div>

          <p className="mt-4 text-xs text-slate-400 text-center">
            Inget beroende av externa bibliotek. Fungerar i alla moderna JS-miljöer, Node.js, Python 3.8+ och bash.
          </p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid sm:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vad rapporten innehåller</p>
            <h2
              className="text-3xl sm:text-4xl text-slate-900 mb-6"
              style={{ fontFamily: "var(--font-dm-serif)" }}
            >
              Allt rådgivaren behöver
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Rapporten genereras i realtid från URL-parametrarna och kräver ingen inloggning av varken rådgivare eller kund.
              Rådgivaren kan redigera ordningen på sektioner, acceptera bytesförslag och dela en skrivskyddad kundlänk.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {FEATURES.map(f => (
              <div key={f} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span className="text-sm text-slate-700">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-6">
          <h2
            className="text-3xl sm:text-4xl text-white"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            Redo att integrera?
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Integrationstiden är typiskt under en timme. Kontakta oss för en teknisk genomgång och diskussion kring er specifika plattform.
          </p>
          <a
            href="mailto:sharpakontakt@gmail.com"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all"
          >
            Kontakta oss →
          </a>
        </div>
      </section>

    </div>
  );
}
