"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Check, Copy, ExternalLink, Loader2, Settings2 } from "lucide-react";

type ManagedPortfolio = {
  id:           string;
  slug:         string;
  display_name: string;
  fee:          number | null;
  active:       boolean;
};
// ── Signing helper ────────────────────────────────────────────────────────────

async function fetchSignature(
  advisorId: string,
  portfolioId: string,
): Promise<{ ts: string; sig: string }> {
  const res = await fetch("/api/radgivning/sign-link", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ advisorId, portfolioId }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? "Signeringen misslyckades");
  }
  return res.json();
}

function buildSignedUrl(
  portfolioId: string,
  advisorId: string,
  name: string,
  ts: string,
  sig: string,
): string {
  const q = new URLSearchParams({ advisor: advisorId, ts, sig });
  if (name) q.set("name", name);
  return `/radgivning/portfolioanalysis/${encodeURIComponent(portfolioId)}?${q}`;
}

// ── Copy button ───────────────────────────────────────────────────────────────

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

// ── Static content ────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "1",
    title: "Välj portfölj",
    body: "Välj en av dina portföljer uppsatta i Morningstar Direct. Systemet känner igen portfölj-ID:t och hämtar all data automatiskt.",
  },
  {
    n: "2",
    title: "Välj rådgivare",
    body: "Koppla en befintlig rådgivare till länken — eller skapa en ny direkt i formuläret. Rådgivarens sparade dashboard-layout följer med.",
  },
  {
    n: "3",
    title: "Skicka länken",
    body: "Länken öppnas direkt i webbläsaren. Rådgivaren kan anpassa sin vy och skicka vidare en kundlänk med samma layout.",
  },
];

const FEATURES = [
  "Tillgångsfördelning — Aktier, Räntor, Kassa, Övrigt",
  "Geografisk fördelning per land/region",
  "Sektorfördelning med procentuell vikt",
  "Morningstar Style Box (Large/Mid/Small × Value/Core/Growth)",
  "Portföljinnehav med vikter och ISIN",
  "Daglig cache — snabb inladdning vid återbesök",
  "Redigerbar dashboard — välj och ordna kort",
  "Rådgivarens layout sparas och visas för kunden via delad länk",
];

const TS_CODE = `import { createHmac } from "crypto";

const LINK_SECRET = process.env.LINK_SECRET!;
const SIGN_URL    = "https://er-domän.se/api/radgivning/sign-link";
const BASE_URL    = "https://er-domän.se";

async function buildPortfolioUrl(params: {
  portfolioId:  string;
  advisorId:    string;
  advisorName?: string; // skapar rådgivaren i DB om ny
  name?:        string; // visningsnamn i dashboarden
}): Promise<string> {
  const { portfolioId, advisorId, advisorName, name } = params;

  // Hämta HMAC-signatur (skapar rådgivare om ny)
  const res = await fetch(SIGN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ advisorId, portfolioId, advisorName }),
  });
  const { ts, sig } = await res.json();

  const q = new URLSearchParams({ advisor: advisorId, ts, sig });
  if (name) q.set("name", name);
  return \`\${BASE_URL}/radgivning/portfolioanalysis/\${portfolioId}?\${q}\`;
}

// Anrop
const url = await buildPortfolioUrl({
  portfolioId:  "abc-123-4567-uuid",
  advisorId:    "199001011234ABC123",
  advisorName:  "Anna Svensson",       // skapas i DB vid första anropet
  name:         "Diskretionär Portfölj 50",
});`;

const PY_CODE = `import requests, os

SIGN_URL = "https://er-domän.se/api/radgivning/sign-link"
BASE_URL = "https://er-domän.se"

def build_portfolio_url(
    portfolio_id:  str,
    advisor_id:    str,
    advisor_name:  str | None = None,  # skapar rådgivaren i DB om ny
    name:          str | None = None,  # visningsnamn i dashboarden
) -> str:
    # Hämta HMAC-signatur (skapar rådgivare om ny)
    payload = {"advisorId": advisor_id, "portfolioId": portfolio_id}
    if advisor_name:
        payload["advisorName"] = advisor_name
    r   = requests.post(SIGN_URL, json=payload)
    ts  = r.json()["ts"]
    sig = r.json()["sig"]

    from urllib.parse import urlencode, quote
    params = {"advisor": advisor_id, "ts": ts, "sig": sig}
    if name:
        params["name"] = name
    return (
        f"{BASE_URL}/radgivning/portfolioanalysis/{quote(portfolio_id)}"
        f"?{urlencode(params)}"
    )

# Anrop
url = build_portfolio_url(
    portfolio_id  = "abc-123-4567-uuid",
    advisor_id    = "199001011234ABC123",
    advisor_name  = "Anna Svensson",    # skapas i DB vid första anropet
    name          = "Diskretionär Portfölj 50",
)`;

// ── Main component ────────────────────────────────────────────────────────────

export default function MorningstarLandingPage() {
  const router = useRouter();
  const [portfolioId,       setPortfolioId]       = useState("");
  const [advisorCode,       setAdvisorCode]       = useState("");
  const [codeTab,           setCodeTab]           = useState<"ts" | "py">("ts");
  const [signing,           setSigning]           = useState(false);
  const [signError,         setSignError]         = useState<string | null>(null);
  const [copiedUrl,         setCopiedUrl]         = useState(false);
  const [managedPortfolios, setManagedPortfolios] = useState<ManagedPortfolio[]>([]);

  useEffect(() => {
    fetch("/api/radgivning/admin/managed-portfolios")
      .then(r => r.ok ? r.json() as Promise<{ portfolios: ManagedPortfolio[] }> : Promise.resolve({ portfolios: [] }))
      .then(d => {
        const active = (d.portfolios ?? []).filter(p => p.active);
        setManagedPortfolios(active);
        if (active.length > 0 && !portfolioId) setPortfolioId(active[0].slug);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canGenerate = Boolean(portfolioId.trim() && advisorCode.trim());

  async function getSignedUrl(): Promise<string | null> {
    setSigning(true);
    setSignError(null);
    try {
      const { ts, sig } = await fetchSignature(advisorCode.trim(), portfolioId.trim());
      return (typeof window !== "undefined" ? window.location.origin : "") +
        buildSignedUrl(portfolioId.trim(), advisorCode.trim(), "", ts, sig);
    } catch (err) {
      setSignError(err instanceof Error ? err.message : "Okänt fel");
      return null;
    } finally {
      setSigning(false);
    }
  }

  async function copyUrl() {
    const url = await getSignedUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    });
  }

  async function openUrl() {
    const url = await getSignedUrl();
    if (!url) return;
    router.push(url);
  }

  const CODE = codeTab === "ts" ? TS_CODE : PY_CODE;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left */}
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 border border-slate-200 bg-white px-4 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              B2B Integration · Morningstar Direct
            </div>

            <div>
              <h1 className="text-[40px] sm:text-[52px] leading-[1.06] tracking-[-0.02em] text-slate-900 mb-5">
                Portföljanalys som<br />en länk
              </h1>
              <p className="text-base sm:text-lg text-slate-500 leading-loose max-w-[420px]">
                Dela interaktiva Morningstar-portföljanalyser med rådgivare — utan inloggning,
                utan manuell datainmatning. Välj portfölj, välj rådgivare, kopiera länk.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#demo"
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-500/25 hover:-translate-y-0.5"
              >
                Generera länk
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
              <span className="ml-2 text-xs text-slate-500 font-mono">portfolio_url.ts</span>
            </div>
            <div className="p-5 font-mono text-xs sm:text-sm leading-[1.8] overflow-x-auto">
              <p><span className="text-blue-400">const</span> <span className="text-white">url</span> <span className="text-slate-400">=</span> <span className="text-emerald-400">buildPortfolioUrl</span><span className="text-slate-400">({"{"}</span></p>
              <p className="pl-4"><span className="text-amber-300">portfolioId</span><span className="text-slate-400">:</span> <span className="text-emerald-300">&quot;abc-123-4567-uuid&quot;</span><span className="text-slate-400">,</span></p>
              <p className="pl-4"><span className="text-amber-300">advisorId</span><span className="text-slate-400">:</span>  <span className="text-emerald-300">&quot;rådgivare-uuid&quot;</span><span className="text-slate-400">,</span></p>
              <p className="pl-4"><span className="text-amber-300">name</span><span className="text-slate-400">:</span>        <span className="text-emerald-300">&quot;Diskretionär Portfölj 50&quot;</span><span className="text-slate-400">,</span></p>
              <p><span className="text-slate-400">{"});"}</span></p>
              <p className="mt-3 text-slate-500">{"// → "}<span className="text-slate-400">https://er-domän.se/radgivning/portfolioanalysis/abc-123...</span></p>
            </div>
          </div>

        </div>
      </section>

      {/* ── Steps ────────────────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {STEPS.map(s => (
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

      {/* ── Interactive demo ──────────────────────────────────────────────────── */}
      <section id="demo" className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="mb-10">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Interaktiv demo</p>
          <h2 className="text-3xl sm:text-4xl text-slate-900 font-bold">Generera en länk</h2>
          <p className="text-slate-500 text-sm mt-2 max-w-xl">
            Välj portfölj och rådgivare nedan. URL:en skapas direkt — kopiera och skicka.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">

          {/* Form */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 space-y-4">

            <div className="grid sm:grid-cols-2 gap-4">

              {/* Portfölj */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Portfölj</label>
                {managedPortfolios.length > 0 ? (
                  <select
                    value={portfolioId}
                    onChange={e => { setPortfolioId(e.target.value); setSignError(null); }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {managedPortfolios.map(p => (
                      <option key={p.id} value={p.slug}>
                        {p.display_name || p.slug}{p.fee != null ? ` — ${p.fee}%` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={portfolioId}
                    onChange={e => { setPortfolioId(e.target.value); setSignError(null); }}
                    placeholder="portfölj-slug"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
                <p className="text-[10px] text-slate-400">
                  {managedPortfolios.length > 0
                    ? "Välj en av de konfigurerade portföljerna"
                    : "Konfigurera portföljer under Admin för att se en dropdown"}
                </p>
              </div>

              {/* Rådgivarkod */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Rådgivarkod
                </label>
                <input
                  value={advisorCode}
                  onChange={e => { setAdvisorCode(e.target.value.trim()); setSignError(null); }}
                  placeholder="199001011234ABC123"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">Personnummer (12 siffror) + rådgivningssystemets ID</p>
              </div>
            </div>

          </div>

          {/* URL output — sticky */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="bg-slate-900 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <span className="text-xs text-slate-500 font-mono">Genererad URL</span>
              </div>
              <div className="p-4 min-h-[80px] flex items-start">
                {canGenerate ? (
                  <p className="font-mono text-xs break-all leading-relaxed">
                    <span className="text-slate-500">{typeof window !== "undefined" ? window.location.origin : ""}</span>
                    <span className="text-blue-400">/radgivning/portfolioanalysis/</span>
                    <span className="text-emerald-400">{portfolioId.trim()}</span>
                    <span className="text-slate-400">?advisor=</span>
                    <span className="text-violet-400">{advisorCode.trim()}</span>
                    <span className="text-slate-500">&amp;ts=…&amp;sig=…</span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 italic">Välj portfölj och ange rådgivarkod för att se URL:en...</p>
                )}
              </div>
            </div>

            {signError && (
              <p className="text-xs text-red-400 font-medium px-1">{signError}</p>
            )}

            {portfolioId.trim() && (
              <button
                onClick={() => router.push(`/radgivning/portfolioanalysis/${encodeURIComponent(portfolioId.trim())}`)}
                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-2xl text-sm transition-all"
              >
                <Settings2 className="w-4 h-4" />
                Öppna analysverktyg (rådgivarläge)
              </button>
            )}

            {canGenerate && (
              <div className="flex gap-2">
                <button
                  onClick={copyUrl}
                  disabled={signing}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 font-semibold py-3.5 rounded-2xl text-sm transition-all",
                    copiedUrl
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-900 hover:bg-slate-700 text-white disabled:opacity-60"
                  )}
                >
                  {signing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Signerar…</>
                    : copiedUrl
                      ? <><Check className="w-4 h-4" /> Kopierat</>
                      : <><Copy className="w-4 h-4" /> Kopiera kundlänk</>}
                </button>
                <button
                  onClick={openUrl}
                  disabled={signing}
                  className="flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold px-5 py-3.5 rounded-2xl text-sm transition-all shadow-md shadow-blue-500/25 hover:-translate-y-0.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  Öppna
                </button>
              </div>
            )}

            {/* Info card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">URL-struktur</p>
              {[
                { p: "portfolioId", type: "path",  req: true,  desc: "Morningstar portfölj-UUID" },
                { p: "advisor",     type: "query", req: true,  desc: "Rådgivarkod" },
                { p: "ts",          type: "query", req: true,  desc: "Unix-tidsstämpel (signerad)" },
                { p: "sig",         type: "query", req: true,  desc: "HMAC-SHA256-signatur" },
                { p: "name",        type: "query", req: false, desc: "Visningsnamn i dashboarden" },
              ].map(row => (
                <div key={row.p} className="flex items-start gap-3 text-xs">
                  <code className="text-blue-600 font-mono shrink-0 w-20">{row.p}</code>
                  <code className="text-slate-400 font-mono shrink-0 w-10">{row.type}</code>
                  <span className={cn(
                    "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded",
                    row.req ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {row.req ? "KRÄVS" : "OPT"}
                  </span>
                  <span className="text-slate-500 leading-tight">{row.desc}</span>
                </div>
              ))}
              <p className="text-[10px] text-slate-400 pt-1">
                Länken är giltig i 30 dagar. Signeras automatiskt med HMAC-SHA256.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Code examples ─────────────────────────────────────────────────────── */}
      <section id="kod" className="border-t border-slate-100 bg-slate-50/60 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Kodexempel</p>
            <h2 className="text-3xl sm:text-4xl text-slate-900 font-bold">Fungerar i alla stackar</h2>
          </div>

          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center gap-1 px-4 pt-4 border-b border-white/10">
              {(["ts", "py"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setCodeTab(t)}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors",
                    codeTab === t ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {{ ts: "TypeScript", py: "Python" }[t]}
                </button>
              ))}
              <div className="ml-auto pb-2">
                <CopyButton text={CODE} />
              </div>
            </div>
            <pre className="p-6 text-xs sm:text-sm font-mono text-slate-300 leading-[1.8] overflow-x-auto whitespace-pre">
              {CODE}
            </pre>
          </div>

          <p className="mt-4 text-xs text-slate-400 text-center">
            Inga externa bibliotek behövs. URL:en är en vanlig HTTPS-länk med portfölj-ID som path-parameter och rådgivar-ID som query-parameter.
          </p>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="grid sm:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vad analysen innehåller</p>
            <h2 className="text-3xl sm:text-4xl text-slate-900 font-bold mb-6">Allt rådgivaren behöver</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Analysen hämtas direkt från Morningstar Direct och cachas dagligen.
              Rådgivaren anpassar sin dashboard och den sparade layouten visas automatiskt
              när kunden öppnar den delade länken.
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

      {/* ── CTA ───────────────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl text-white font-bold">
            Redo att komma igång?
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Kräver en aktiv Morningstar Direct-licens och access till portfölj-API:et.
            Kontakta oss för en teknisk genomgång.
          </p>
          <a
            href="mailto:kontakt@fondanalys.se"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all"
          >
            Kontakta oss →
          </a>
        </div>
      </section>

    </div>
  );
}
