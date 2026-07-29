"use client";

import { useState } from "react";
import { Trash2, UserPlus, Save, Check, RefreshCw, Plus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Managed portfolio types ───────────────────────────────────────────────────

type ManagedPortfolio = {
  id:             string;
  morningstar_id: string;
  slug:           string;
  display_name:   string;
  fee:            number | null;
  risk_level:     number | null;
  portfolio_type: string;
  commentary:     string;
  active:         boolean;
  created_at:     string;
  updated_at:     string;
};

type Advisor = {
  code:       string;
  name:       string;
  created_at: string;
  dashboard:  { sections: string[]; updated_at: string } | null;
};

// ── Exponerade portföljer ─────────────────────────────────────────────────────

function ManagedPortfoliosSection({ initial }: { initial: ManagedPortfolio[] }) {
  const [portfolios, setPortfolios] = useState<ManagedPortfolio[]>(initial);
  const [showAdd,    setShowAdd]    = useState(false);
  const [msId,       setMsId]       = useState("");
  const [slug,       setSlug]       = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  async function reload() {
    const res  = await fetch("/api/radgivning/admin/managed-portfolios");
    const data = await res.json() as { portfolios: ManagedPortfolio[] };
    setPortfolios(data.portfolios);
  }

  async function toggleActive(p: ManagedPortfolio) {
    await fetch("/api/radgivning/admin/managed-portfolios", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: p.id, active: !p.active }),
    });
    await reload();
  }

  async function remove(p: ManagedPortfolio) {
    const label = p.display_name || p.slug;
    if (!window.confirm(`Ta bort "${label}"? Detta går inte att ångra.`)) return;
    await fetch("/api/radgivning/admin/managed-portfolios", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: p.id }),
    });
    await reload();
  }

  async function addPortfolio(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/radgivning/admin/managed-portfolios", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ morningstar_id: msId, slug, display_name: displayName }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      setError(json.error ?? "Något gick fel");
    } else {
      setMsId(""); setSlug(""); setDisplayName(""); setShowAdd(false);
      await reload();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Exponerade portföljer</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Välj vilka Morningstar-portföljer som exponeras via analysverktyget.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={reload}
            className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Uppdatera
          </button>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" /> Lägg till portfölj
          </button>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={addPortfolio}
          className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4"
        >
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Ny portfölj</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Morningstar-ID
              </label>
              <input
                required
                value={msId}
                onChange={e => setMsId(e.target.value.trim())}
                placeholder="FOGBR$$ALL_1234"
                className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                URL-kod (slug)
              </label>
              <input
                required
                value={slug}
                onChange={e => setSlug(e.target.value.trim().toLowerCase())}
                placeholder="global-equity"
                className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400">Används i URL:en — inga mellanslag</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Visningsnamn
              </label>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Global Aktieportfölj"
                className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md transition-colors disabled:opacity-60"
            >
              {saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sparar…</>
                : <><Plus className="w-4 h-4" /> Lägg till</>}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setError(""); }}
              className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2.5 rounded-md transition-colors"
            >
              Avbryt
            </button>
          </div>
        </form>
      )}

      {portfolios.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Inga portföljer konfigurerade ännu.
        </div>
      ) : (
        <div className="space-y-3">
          {portfolios.map(p => (
            <div key={p.id} className="bg-white rounded-lg border border-slate-200 shadow-sm px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{p.display_name || p.slug}</p>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      p.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400",
                    )}>
                      {p.active ? "Aktiv" : "Inaktiv"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs text-slate-500 font-mono">{p.slug}</p>
                    <span className="text-slate-200">·</span>
                    <p className="text-xs text-slate-300 font-mono truncate">{p.morningstar_id}</p>
                    {p.fee != null && (
                      <>
                        <span className="text-slate-200">·</span>
                        <p className="text-xs text-slate-400">{p.fee}% avgift</p>
                      </>
                    )}
                    {p.risk_level != null && (
                      <>
                        <span className="text-slate-200">·</span>
                        <p className="text-xs text-slate-400">Risk: {{ 1: "Låg", 2: "Medellåg", 3: "Medelhög", 4: "Hög", 5: "Mycket hög" }[p.risk_level] ?? p.risk_level}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => void toggleActive(p)}
                    className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {p.active ? "Inaktivera" : "Aktivera"}
                  </button>
                  <a
                    href={`/radgivning/admin/portfolios/${p.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Redigera
                  </a>
                  <button
                    onClick={() => void remove(p)}
                    className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded-lg"
                    title="Ta bort"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inställningar ─────────────────────────────────────────────────────────────

function SettingsPanel({ initial }: { initial: Record<string, string> }) {
  const [fields, setFields] = useState({
    morningstar_api_token: initial.morningstar_api_token ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/radgivning/admin/settings", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(fields),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-5">
      <h2 className="text-sm font-bold text-slate-900">Morningstar-inställningar</h2>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Auth Token</label>
          <input
            type="password"
            value={fields.morningstar_api_token}
            onChange={e => setFields(p => ({ ...p, morningstar_api_token: e.target.value }))}
            placeholder="••••••••••••••••"
            className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className={cn(
          "flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-md transition-all",
          saved
            ? "bg-emerald-500 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        )}
      >
        {saved
          ? <><Check className="w-4 h-4" /> Sparat!</>
          : saving
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sparar…</>
            : <><Save className="w-4 h-4" /> Spara</>}
      </button>
    </div>
  );
}

// ── Lägg till rådgivare ───────────────────────────────────────────────────────

function AddAdvisorForm({ onAdded }: { onAdded: () => void }) {
  const [code,   setCode]   = useState("");
  const [name,   setName]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/radgivning/admin/advisors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code, name }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      setError(json.error ?? "Något gick fel");
    } else {
      setCode(""); setName("");
      onAdded();
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-4">
      <h2 className="text-sm font-bold text-slate-900">Lägg till rådgivare</h2>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Namn</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Anna Svensson"
            className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Rådgivarkod</label>
          <input
            required
            value={code}
            onChange={e => setCode(e.target.value.trim())}
            placeholder="199001011234ABC123"
            className="w-full border border-slate-200 rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-slate-400">Personnummer + rådgivningssystemets ID</p>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 text-sm font-semibold bg-slate-900 hover:bg-slate-700 text-white px-4 py-2.5 rounded-md transition-colors disabled:opacity-60"
      >
        <UserPlus className="w-4 h-4" />
        {saving ? "Sparar…" : "Lägg till"}
      </button>
    </form>
  );
}

// ── Rådgivarlista ─────────────────────────────────────────────────────────────

function AdvisorList({ initial }: { initial: Advisor[] }) {
  const [advisors, setAdvisors] = useState<Advisor[]>(initial);
  const [removing, setRemoving] = useState<string | null>(null);

  async function reload() {
    const res  = await fetch("/api/radgivning/admin/advisors");
    const data = await res.json() as { advisors: Advisor[] };
    setAdvisors(data.advisors);
  }

  async function remove(code: string) {
    setRemoving(code);
    await fetch("/api/radgivning/admin/advisors", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code }),
    });
    setRemoving(null);
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">Rådgivare ({advisors.length})</h2>
        <button onClick={reload} className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors">
          <RefreshCw className="w-3 h-3" /> Uppdatera
        </button>
      </div>

      {advisors.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-400 text-sm">
          Inga rådgivare tillagda ännu.
        </div>
      ) : (
        <div className="space-y-3">
          {advisors.map(a => (
            <div key={a.code} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{a.code}</p>
                </div>
                <button
                  onClick={() => remove(a.code)}
                  disabled={removing === a.code}
                  className="shrink-0 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-50 p-1 rounded-lg"
                  title="Ta bort"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddAdvisorForm onAdded={reload} />
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function AdminClient({
  advisors,
  settings,
  managedPortfolios,
}: {
  advisors:          Advisor[];
  settings:          Record<string, string>;
  managedPortfolios: ManagedPortfolio[];
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">

        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Portföljanalys · Admin
          </p>
          <h1 className="text-3xl font-bold text-slate-900">Administrationspanel</h1>
        </div>

        <ManagedPortfoliosSection initial={managedPortfolios} />
        <SettingsPanel initial={settings} />
        <AdvisorList initial={advisors} />

      </div>
    </div>
  );
}
