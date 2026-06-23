"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Check, RefreshCw, AlertCircle, FileText, Upload, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ManagedPortfolio = {
  id: string;
  morningstar_id: string;
  slug: string;
  display_name: string;
  fee: number | null;
  risk_level: number | null;
  portfolio_type: string;
  commentary: string;
  metadata: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Doc = {
  id: string;
  file_name: string;
  size_bytes: number | null;
  uploaded_at: string;
  url: string | null;
};

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function execCmd(cmd: string, value?: string) {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  document.execCommand(cmd, false, value);
}

export default function EditPortfolioClient({ portfolio: initial }: { portfolio: ManagedPortfolio }) {
  const [fields, setFields] = useState({
    slug:              initial.slug,
    display_name:      initial.display_name,
    fee:               initial.fee != null ? String(initial.fee) : "",
    risk_level:        initial.risk_level != null ? String(initial.risk_level) : "",
    portfolio_type:    initial.portfolio_type,
    active:            initial.active,
    commentary_title:  typeof initial.metadata?.commentary_title === "string" ? initial.metadata.commentary_title : "",
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // ── Documents ──────────────────────────────────────────────────────────────

  const [docs,       setDocs]       = useState<Doc[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [docsLoading,setDocsLoading]= useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [docError,   setDocError]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    setDocsLoading(true);
    setDocError(null);
    try {
      const res  = await fetch(`/api/radgivning/portfolioanalysis/${encodeURIComponent(initial.morningstar_id)}/documents`);
      const json = await res.json() as { documents?: Doc[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDocs(json.documents ?? []);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Fel vid hämtning");
    } finally {
      setDocsLoading(false);
      setDocsLoaded(true);
    }
  }, [initial.morningstar_id]);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  async function uploadDoc(file: File) {
    setUploading(true);
    setDocError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res  = await fetch(`/api/radgivning/portfolioanalysis/${encodeURIComponent(initial.morningstar_id)}/documents`, {
        method: "POST",
        body:   form,
      });
      const json = await res.json() as { document?: Doc; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (json.document) setDocs(prev => [json.document!, ...prev]);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Uppladdning misslyckades");
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id));
    try {
      const res = await fetch(`/api/radgivning/portfolioanalysis/${encodeURIComponent(initial.morningstar_id)}/documents`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setDocError(e instanceof Error ? e.message : "Radering misslyckades");
      void loadDocs();
    }
  }

  // ── Form save ──────────────────────────────────────────────────────────────

  function set<K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) {
    setFields(prev => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const commentary = editorRef.current?.innerHTML ?? initial.commentary;
    const res = await fetch("/api/radgivning/admin/managed-portfolios", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id:             initial.id,
        slug:           fields.slug,
        display_name:   fields.display_name,
        fee:            fields.fee !== "" ? parseFloat(fields.fee) : null,
        risk_level:     fields.risk_level !== "" ? parseInt(fields.risk_level, 10) : null,
        portfolio_type: fields.portfolio_type,
        commentary,
        active:         fields.active,
        metadata:       { ...initial.metadata, commentary_title: fields.commentary_title.trim() || null },
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const json = await res.json() as { error?: string };
      setError(json.error ?? "Något gick fel");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        <a
          href="/radgivning/admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Admin
        </a>

        <div className="mb-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Portföljanalys · Admin · Portfölj
          </p>
          <h1 className="text-3xl font-bold text-slate-900">
            {initial.display_name || initial.slug}
          </h1>
          <p className="text-sm text-slate-400 font-mono mt-1">{initial.morningstar_id}</p>
        </div>

        <form onSubmit={save} className="space-y-6">

          {/* Grundinformation */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-900">Grundinformation</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Visningsnamn
                </label>
                <input
                  value={fields.display_name}
                  onChange={e => set("display_name", e.target.value)}
                  placeholder="Global Aktieportfölj"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  URL-slug
                </label>
                <input
                  required
                  value={fields.slug}
                  onChange={e => set("slug", e.target.value.trim().toLowerCase())}
                  placeholder="global-aktier"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">
                  Länk: /radgivning/portfolioanalysis/
                  <strong>{fields.slug || "…"}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Morningstar-ID
              </label>
              <input
                value={initial.morningstar_id}
                readOnly
                className="w-full border border-slate-100 bg-slate-50 rounded-xl px-3 py-2.5 text-sm font-mono text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={fields.active}
                onClick={() => set("active", !fields.active)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  fields.active ? "bg-emerald-500" : "bg-slate-200",
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  fields.active ? "translate-x-6" : "translate-x-1",
                )} />
              </button>
              <span className="text-sm text-slate-600">
                {fields.active
                  ? "Aktiv — synlig för analysverktyget"
                  : "Inaktiv — dold för analysverktyget"}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <h2 className="text-sm font-bold text-slate-900">Metadata</h2>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Avgift (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={fields.fee}
                  onChange={e => set("fee", e.target.value)}
                  placeholder="0.50"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Risknivå (1–7)
                </label>
                <select
                  value={fields.risk_level}
                  onChange={e => set("risk_level", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">—</option>
                  <option value="1">1 — Låg</option>
                  <option value="2">2 — Medellåg</option>
                  <option value="3">3 — Medelhög</option>
                  <option value="4">4 — Hög</option>
                  <option value="5">5 — Mycket hög</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Portföljtyp
                </label>
                <select
                  value={fields.portfolio_type}
                  onChange={e => set("portfolio_type", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="equity">Aktier (equity)</option>
                  <option value="bond">Räntor (bond)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dashboard-kommentar */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 mb-3">Dashboard-kommentar</h2>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Sektionsrubrik
                </label>
                <input
                  value={fields.commentary_title}
                  onChange={e => set("commentary_title", e.target.value)}
                  placeholder="Kommentar från portföljförvaltaren"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400">Visas som rubrik ovanför kommentarstexten. Tomt = standardrubrik.</p>
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 py-2 bg-slate-50 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-900 mr-3">Kommentarstext</h2>
              <div className="flex gap-0.5">
                {(["H2", "H3"] as const).map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); execCmd("formatBlock", tag.toLowerCase()); }}
                    className="px-2 py-1 rounded text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("formatBlock", "p"); }}
                  className="px-2 py-1 rounded text-xs font-semibold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Normal
                </button>
              </div>
              <span className="w-px h-4 bg-slate-200 mx-1" />
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("bold"); }}
                  className="px-2 py-1 rounded text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  B
                </button>
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); execCmd("italic"); }}
                  className="px-2 py-1 rounded text-xs italic font-semibold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  I
                </button>
              </div>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: initial.commentary }}
              className="min-h-[160px] px-4 py-3 text-sm text-slate-700 focus:outline-none prose prose-sm max-w-none"
            />
            <p className="text-[11px] text-slate-400 px-4 pb-3">
              Visas som ett kommentarsblock högst upp på portföljens dashboard.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className={cn(
              "flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl transition-all",
              saved
                ? "bg-emerald-500 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60",
            )}
          >
            {saved
              ? <><Check className="w-4 h-4" /> Sparat!</>
              : saving
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sparar…</>
                : <><Save className="w-4 h-4" /> Spara ändringar</>}
          </button>

        </form>

        {/* Portföljdokument (utanför formuläret, egna API-anrop) */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Portföljdokument</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Visas i dokumentpanelen på portföljens dashboard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadDocs()}
                className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Uppdatera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? "Laddar upp…" : "Ladda upp"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadDoc(f); e.target.value = ""; }}
              />
            </div>
          </div>

          {docsLoading && !docsLoaded ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          ) : docs.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Inga dokument uppladdade än.</p>
          ) : (
            <div className="divide-y divide-slate-50 -mx-6">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-6 py-3 group hover:bg-slate-50 transition-colors">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <a
                      href={doc.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-slate-800 hover:text-blue-600 truncate block transition-colors"
                    >
                      {doc.file_name}
                    </a>
                    <p className="text-[11px] text-slate-400">{formatBytes(doc.size_bytes)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeDoc(doc.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1 rounded shrink-0"
                    title="Ta bort"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {docError && <p className="text-xs text-red-500">{docError}</p>}
        </div>

      </div>
    </div>
  );
}
