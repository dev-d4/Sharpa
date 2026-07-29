"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw, Settings2, X, AlertCircle,
  Check, Link2, Save, GripVertical, Plus, Maximize2,
  Paperclip, FileText, Loader2, Info, BarChart2, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DonutChart from "@/components/ui/DonutChart";
import StyleBox from "@/components/ui/StyleBox";
import PerformanceChart from "@/components/ui/PerformanceChart";
import ComparisonTool from "./ComparisonTool";
import type { PortfolioData } from "@/lib/morningstar-api";
import type { TWRData } from "@/lib/twr-mock-data";

// ── Types ─────────────────────────────────────────────────────────────────────

type SectionId =
  | "summary"
  | "asset-allocation"
  | "holdings"
  | "stylebox"
  | "regions"
  | "sectors"
  | "advisor-comment"
  | "performance";

type LayoutRow = { ids: [SectionId] | [SectionId, SectionId] };

const SECTION_LABELS: Record<SectionId, string> = {
  "summary":          "Sammanfattning",
  "asset-allocation": "Tillgångsallokering",
  "holdings":         "Innehav",
  "stylebox":         "Förvaltningsstil, Aktier",
  "regions":          "Geografisk fördelning, Aktier",
  "sectors":          "Sektorfördelning, Aktier",
  "advisor-comment":  "Rådgivarkommentar",
  "performance":      "Utveckling",
};

const ALL_SECTIONS: SectionId[] = [
  "summary", "asset-allocation", "holdings", "stylebox", "regions", "sectors", "advisor-comment", "performance",
];

const DEFAULT_LAYOUT: LayoutRow[] = [
  { ids: ["summary"] },
  { ids: ["asset-allocation"] },
  { ids: ["holdings"] },
  { ids: ["stylebox"] },
  { ids: ["regions", "sectors"] },
];

function toRow(ids: SectionId[]): LayoutRow | null {
  if (ids.length === 0) return null;
  if (ids.length === 1) return { ids: [ids[0]] };
  return { ids: [ids[0], ids[1]] };
}

function parseLayout(saved: unknown): LayoutRow[] {
  if (!saved || !Array.isArray(saved) || saved.length === 0) return DEFAULT_LAYOUT;
  const first = saved[0];

  if (typeof first === "object" && first !== null && !Array.isArray(first) && "ids" in first) {
    const rows = (saved as { ids: string[] }[])
      .map(row => toRow((row.ids ?? []).filter(id => ALL_SECTIONS.includes(id as SectionId)) as SectionId[]))
      .filter((r): r is LayoutRow => r !== null);
    return rows.length > 0 ? rows : DEFAULT_LAYOUT;
  }

  if (Array.isArray(first)) {
    const rows = (saved as string[][])
      .map(row => toRow(row.filter(id => ALL_SECTIONS.includes(id as SectionId)) as SectionId[]))
      .filter((r): r is LayoutRow => r !== null);
    return rows.length > 0 ? rows : DEFAULT_LAYOUT;
  }

  if (typeof first === "string") {
    const rows = (saved as string[])
      .filter(id => ALL_SECTIONS.includes(id as SectionId))
      .map(id => ({ ids: [id as SectionId] as [SectionId] }));
    return rows.length > 0 ? rows : DEFAULT_LAYOUT;
  }

  return DEFAULT_LAYOUT;
}

function parseSavedData(saved: unknown): { layout: LayoutRow[]; comment: string } {
  if (saved && typeof saved === "object" && !Array.isArray(saved) && "rows" in saved) {
    const s = saved as { rows?: unknown; comment?: unknown };
    return {
      layout:  parseLayout(s.rows),
      comment: typeof s.comment === "string" ? s.comment : "",
    };
  }
  return { layout: parseLayout(saved), comment: "" };
}

// ── Asset category visuals ────────────────────────────────────────────────────

const ASSET_LABEL: Record<string, string> = {
  "Aktier":         "Aktier",
  "Räntor":         "Räntor",
  "Kassa":          "Kassa",
  "Övrigt":         "Övrigt",
  "Equity":         "Aktier",
  "Bond":           "Räntor",
  "Cash":           "Kassa",
  "Other":          "Övrigt",
  "Not Classified": "Oklassificerat",
};

const ASSET_COLOR: Record<string, string> = {
  "Aktier":         "#274C77",
  "Räntor":         "#6096BA",
  "Kassa":          "#D8C3A5",
  "Övrigt":         "#8B9D83",
  "Equity":         "#274C77",
  "Bond":           "#6096BA",
  "Cash":           "#D8C3A5",
  "Other":          "#8B9D83",
  "Not Classified": "#8D95A3",
};

function getSectionMeta(id: SectionId, data: PortfolioData): string | undefined {
  if (id === "holdings") return `${data.holdings.length} positioner`;
  return undefined;
}

// ── Portfolio summary text ────────────────────────────────────────────────────

function buildSummary(data: PortfolioData): string {
  const sentences: string[] = [];

  const top3 = [...data.holdings].sort((a, b) => b.weight - a.weight).slice(0, 3);
  if (top3.length > 0) {
    const fmt  = (h: typeof top3[0]) => `${h.name} (${h.weight.toFixed(1)}%)`;
    const list = top3.length === 1
      ? fmt(top3[0])
      : top3.length === 2
        ? `${fmt(top3[0])} och ${fmt(top3[1])}`
        : `${fmt(top3[0])}, ${fmt(top3[1])} och ${fmt(top3[2])}`;
    const label = top3.length >= 3 ? "tre" : top3.length === 2 ? "två" : "";
    sentences.push(`Portföljens ${label ? label + " " : ""}största innehav är ${list}.`);
  }

  const equity = data.asset_allocation.find(a => a.category === "Aktier" || a.category === "Equity");
  const bond   = data.asset_allocation.find(a => a.category === "Räntor" || a.category === "Bond");
  if (equity && bond) {
    sentences.push(
      `Tillgångarna fördelas på ${equity.percentage.toFixed(1)}% aktier och ${bond.percentage.toFixed(1)}% räntor.`,
    );
  } else if (equity) {
    sentences.push(`Aktieandelen uppgår till ${equity.percentage.toFixed(1)}%.`);
  } else if (bond) {
    sentences.push(`Ränteandelen uppgår till ${bond.percentage.toFixed(1)}%.`);
  }

  const top2r = [...data.regions].sort((a, b) => b.percentage - a.percentage).slice(0, 2);
  if (top2r.length >= 2) {
    sentences.push(
      `Störst geografisk exponering mot ${top2r[0].name} (${top2r[0].percentage.toFixed(1)}%) och ${top2r[1].name} (${top2r[1].percentage.toFixed(1)}%).`,
    );
  } else if (top2r.length === 1) {
    sentences.push(`Störst geografisk exponering mot ${top2r[0].name} (${top2r[0].percentage.toFixed(1)}%).`);
  }

  const top2s = [...data.sectors].sort((a, b) => b.percentage - a.percentage).slice(0, 2);
  if (top2s.length >= 2) {
    sentences.push(
      `Dominerande sektorer är ${top2s[0].name} (${top2s[0].percentage.toFixed(1)}%) och ${top2s[1].name} (${top2s[1].percentage.toFixed(1)}%).`,
    );
  } else if (top2s.length === 1) {
    sentences.push(`Dominerande sektor är ${top2s[0].name} (${top2s[0].percentage.toFixed(1)}%).`);
  }

  return sentences.join(" ");
}

// ── Documents panel ───────────────────────────────────────────────────────────

type Doc = {
  id: string;
  file_name: string;
  size_bytes: number | null;
  uploaded_at: string;
  url: string | null;
};

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPanel({
  portfolioId,
  onCountChange,
}: {
  portfolioId:   string;
  onCountChange: (n: number) => void;
}) {
  const [docs,    setDocs]    = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/radgivning/portfolioanalysis/${encodeURIComponent(portfolioId)}/documents`);
      const json = await res.json() as { documents?: Doc[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setDocs(json.documents ?? []);
      onCountChange((json.documents ?? []).length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fel vid hämtning");
    } finally {
      setLoading(false);
    }
  }, [portfolioId, onCountChange]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="w-72 flex flex-col">
      <div className="px-4 py-3 border-b border-[#F6F7F9]">
        <p className="text-[11px] font-semibold text-[#8D95A3] uppercase tracking-widest">Dokument</p>
      </div>
      <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-[#F0F2F5]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-[#8D95A3]" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-xs text-[#8D95A3] text-center py-8 px-4">Inga dokument uppladdade</p>
        ) : (
          docs.map(doc => (
            <a
              key={doc.id}
              href={doc.url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8F9FB] transition-colors"
            >
              <FileText className="w-4 h-4 text-[#8D95A3] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#1E2430] hover:text-[#274C77] truncate transition-colors">
                  {doc.file_name}
                </p>
                {doc.size_bytes && (
                  <p className="text-[10px] text-[#8D95A3]">{formatBytes(doc.size_bytes)}</p>
                )}
              </div>
            </a>
          ))
        )}
      </div>
      {error && (
        <p className="text-[11px] text-red-500 px-4 py-2 border-t border-[#F6F7F9]">{error}</p>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupToTop(
  items: { name: string; percentage: number }[],
  n: number,
): { name: string; percentage: number }[] {
  if (items.length <= n) return items;
  const top  = items.slice(0, n);
  const rest = items.slice(n).reduce((s, i) => s + i.percentage, 0);
  return [...top, { name: "Övrigt", percentage: Math.round(rest * 10) / 10 }];
}

function EmptyState() {
  return <p className="text-sm text-[#8D95A3] py-12">Ingen data tillgänglig</p>;
}

function StatCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium text-[#8D95A3] uppercase tracking-[0.1em]">{label}</span>
      <span
        className="text-2xl font-semibold tabular-nums leading-none"
        style={{ color: color ?? "#1E2430" }}
      >
        {value}
      </span>
    </div>
  );
}

const RISK_LABELS: Record<number, string> = {
  1: "Låg",
  2: "Medellåg",
  3: "Medelhög",
  4: "Hög",
  5: "Mycket hög",
};

function RiskLevelCell({ level }: { level: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-medium text-[#8D95A3] uppercase tracking-[0.1em]">Risknivå</span>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 mt-0.5">
          {[1, 2, 3, 4, 5].map(n => (
            <div
              key={n}
              className="w-3 h-3 rounded-full transition-all"
              style={{ background: n <= level ? "#274C77" : "#9BA3AE" }}
            />
          ))}
        </div>
        <span className="text-sm font-semibold text-[#274C77]">{RISK_LABELS[level] ?? level}</span>
      </div>
    </div>
  );
}

// ── Rådgivarkommentar ─────────────────────────────────────────────────────────

function AdvisorCommentSection({
  value,
  onChange,
  canEdit,
}: {
  value:    string;
  onChange: (v: string) => void;
  canEdit:  boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  if (!canEdit) {
    if (!value.trim()) return null;
    return (
      <div className="overflow-hidden">
        <span
          className="float-right font-serif select-none pointer-events-none"
          style={{ color: "#B8CDE4", fontSize: "72px", lineHeight: "1", marginLeft: "12px", marginTop: "-6px" }}
        >
          &rdquo;
        </span>
        <p className="text-[15px] text-[#5B6472] leading-relaxed whitespace-pre-wrap">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="font-serif select-none pointer-events-none"
        style={{ color: "#CDDFF0", fontSize: "64px", lineHeight: "0.68", marginBottom: "6px" }}
      >
        &ldquo;
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        placeholder="Skriv en kommentar till dina kunder…"
        rows={4}
        className="w-full text-[15px] text-[#5B6472] bg-transparent resize-none outline-none placeholder:text-[#C0C6CE] leading-relaxed min-h-[96px]"
      />
    </div>
  );
}

// ── Holdings table ────────────────────────────────────────────────────────────

function HoldingsSection({ data }: { data: PortfolioData }) {
  const total    = data.holdings.reduce((s, h) => s + h.weight, 0);
  const showMeta = data.holdings.some(h => h.fund_type != null);

  const thCls = "text-left text-[11px] font-semibold text-[#8D95A3] uppercase tracking-wide pb-2.5 pt-2.5 px-3 border-b border-[#E8EAE8] bg-white whitespace-nowrap";
  const tdCls = "px-3 py-3.5 text-sm text-[#5B6472] whitespace-nowrap";

  return (
    <div className="rounded-md overflow-hidden inline-block min-w-full">
      <table className="border-collapse">
        <thead>
          <tr>
            <th className={`${thCls} text-right pr-4`}>#</th>
            <th className={`${thCls} pl-0`}>Fond</th>
            {showMeta && <>
              <th className={thCls}>Fondtyp</th>
              <th className={thCls}>Förvaltning</th>
              <th className={`${thCls} text-right`}>Avgift</th>
            </>}
            <th className={`${thCls} text-right`}>Andel</th>
          </tr>
        </thead>
        <tbody>
          {data.holdings.map((h, i) => (
            <tr key={h.isin || i} style={{ background: i % 2 === 0 ? "#FAFAF8" : "#F2F3F0" }}>
              <td className={`${tdCls} text-right text-[#8D95A3] tabular-nums pr-4 select-none`}>{i + 1}</td>
              <td className={`${tdCls} font-semibold text-[#1E2430] pl-0`}>{h.name}</td>
              {showMeta && <>
                <td className={tdCls}>{h.fund_type ?? ""}</td>
                <td className={tdCls}>{h.management && h.management !== "-" ? h.management : ""}</td>
                <td className={`${tdCls} text-right tabular-nums`}>
                  {h.fee == null ? "" : h.fee === 0 ? "–" : `${h.fee.toFixed(2)}%`}
                </td>
              </>}
              <td className={`${tdCls} text-right font-semibold text-[#274C77] tabular-nums`}>
                {h.weight.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#E8EAE8] bg-white">
            <td className="px-3 py-3.5 text-right pr-4" />
            <td className="px-3 py-3.5 pl-0 text-[11px] font-semibold text-[#8D95A3] uppercase tracking-wide">Totalt</td>
            {showMeta && <><td /><td /><td /></>}
            <td className="px-3 py-3.5 text-right text-sm font-semibold text-[#1E2430] tabular-nums">{total.toFixed(1)}%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Section data ──────────────────────────────────────────────────────────────

function SectionData({ id, data, twrData }: { id: SectionId; data: PortfolioData; twrData: TWRData | null }) {
  switch (id) {

    case "summary": {
      const text = buildSummary(data);
      return text
        ? <p className="text-[15px] sm:text-base leading-loose text-[#5B6472] font-light">{text}</p>
        : <EmptyState />;
    }

    case "asset-allocation": {
      if (!data.asset_allocation.length) return <EmptyState />;
      const slices = data.asset_allocation.map(a => ({
        label:  ASSET_LABEL[a.category] ?? a.category,
        weight: a.percentage,
        color:  ASSET_COLOR[a.category],
      }));
      return <DonutChart slices={slices} size={180} thickness={36} horizontal legendValueColor="#274C77" />;
    }

    case "stylebox":
      return data.stylebox.length > 0
        ? <div className="py-2"><StyleBox data={data.stylebox} heatColors={["#F6F7F9","#DCE5F0","#B9CCE3","#87A8CF","#5B82B7","#274C77"]} /></div>
        : <EmptyState />;

    case "holdings":
      return data.holdings.length > 0 ? <HoldingsSection data={data} /> : <EmptyState />;

    case "regions": {
      const slices = groupToTop(data.regions, 11).map(r => ({ label: r.name, weight: r.percentage }));
      return slices.length > 0
        ? <DonutChart slices={slices} size={160} thickness={28} horizontal palette={["#274C77","#6096BA","#A3CEF1","#8B9D83","#D8C3A5","#B8A0C8","#5B6472","#87A8CF","#1F3D61","#4A7BA4","#C8D8E8","#8D95A3"]} legendValueColor="#274C77" />
        : <EmptyState />;
    }

    case "sectors": {
      const slices = groupToTop(data.sectors, 11).map(s => ({ label: s.name, weight: s.percentage }));
      return slices.length > 0
        ? <DonutChart slices={slices} size={160} thickness={28} horizontal palette={["#274C77","#6096BA","#A3CEF1","#8B9D83","#D8C3A5","#B8A0C8","#5B6472","#87A8CF","#1F3D61","#4A7BA4","#C8D8E8","#8D95A3"]} legendValueColor="#274C77" />
        : <EmptyState />;
    }

    case "advisor-comment":
      return null;

    case "performance":
      return twrData
        ? <PerformanceChart data={twrData} />
        : <EmptyState />;
  }
}

// ── Commentary (server-rendered, read-only) ───────────────────────────────────

type Commentary = { id: string; content: string; title?: string };

function CommentarySection({ entries }: { entries: Commentary[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-0 mb-4">
      {entries.map(entry => (
        <div key={entry.id} className="py-10 sm:py-12">
          <div className="flex items-center justify-between pb-4 mb-7 border-b border-[#E5E7EB]">
            <span className="text-sm font-semibold tracking-[0.08em] uppercase text-[#5B6472]">
              {entry.title || "Kommentar från portföljförvaltaren"}
            </span>
          </div>
          <div className="overflow-hidden">
            <span
              className="float-right font-serif select-none pointer-events-none"
              style={{ color: "#B8CDE4", fontSize: "72px", lineHeight: "1", marginLeft: "12px", marginTop: "-6px" }}
            >
              &rdquo;
            </span>
            <div
              dangerouslySetInnerHTML={{ __html: entry.content }}
              className="prose prose-sm max-w-none text-[15px] text-[#5B6472] leading-relaxed"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section card header ───────────────────────────────────────────────────────

function SectionCardHeader({
  id,
  data,
  rowIdx,
  editMode,
  canEdit,
  isPair,
  colIdx,
  onDragStart,
  onDragEnd,
  onRemove,
  onSplit,
  panelDragId,
}: {
  id:          SectionId;
  data:        PortfolioData;
  rowIdx:      number;
  editMode:    boolean;
  canEdit:     boolean;
  isPair:      boolean;
  colIdx?:     number;
  onDragStart: () => void;
  onDragEnd:   () => void;
  onRemove:    () => void;
  onSplit?:    () => void;
  panelDragId: SectionId | null;
}) {
  void rowIdx;
  const meta = getSectionMeta(id, data);

  return (
    <div
      draggable={canEdit && !isPair && panelDragId === null}
      onDragStart={canEdit && !isPair ? onDragStart : undefined}
      onDragEnd={canEdit && !isPair ? onDragEnd : undefined}
      className={cn(
        "flex items-center justify-between pb-4 mb-7 border-b border-[#E5E7EB]",
        canEdit && !isPair && "cursor-grab active:cursor-grabbing select-none",
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {editMode && <GripVertical className="w-4 h-4 text-[#C0C6CE] shrink-0" />}
        <span className="text-sm font-semibold tracking-[0.08em] uppercase text-[#5B6472]">
          {SECTION_LABELS[id]}
        </span>
        {meta && (
          <span className="text-[11px] text-[#8D95A3] bg-[#F5F5F2] px-2 py-0.5 rounded-full leading-none">
            {meta}
          </span>
        )}
      </div>
      {editMode && (
        <div className="flex items-center gap-0.5 shrink-0">
          {isPair && colIdx === 0 && onSplit && (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); onSplit(); }}
              title="Dela upp"
              className="p-1.5 text-[#8D95A3] hover:text-[#274C77] transition-colors rounded-lg hover:bg-[#EEF4FF]"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onRemove(); }}
            title="Dölj sektion"
            className="p-1.5 text-[#8D95A3] hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

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
};

export default function MorningstarDashboard({
  portfolioId,
  urlSlug,
  portfolioName,
  portfolioType,
  data,
  error,
  advisorId,
  linkTs,
  linkSig,
  savedSections,
  commentary,
  twrData,
  managedPortfolio,
  canEdit,
}: {
  portfolioId:      string;
  urlSlug?:         string;
  portfolioName:    string;
  portfolioType:    "equity" | "bond";
  data:             PortfolioData | null;
  error:            string | null;
  advisorId:        string | null;
  linkTs:           string | null;
  linkSig:          string | null;
  savedSections:    unknown;
  commentary:       Commentary[];
  twrData:          TWRData | null;
  managedPortfolio: ManagedPortfolio | null;
  canEdit:          boolean;
}) {
  void portfolioType;

  const router   = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const [activeTab,  setActiveTab]  = useState<"analysis" | "comparison">("analysis");
  const [busy,      setBusy]      = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied,    setCopied]    = useState(false);

  const [docsOpen, setDocsOpen] = useState(false);
  const [docCount, setDocCount] = useState(0);
  const docsRef      = useRef<HTMLDivElement>(null);
  const dragYRef     = useRef<number>(-1);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!docsOpen) return;
    function handleClick(e: MouseEvent) {
      if (docsRef.current && !docsRef.current.contains(e.target as Node)) setDocsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [docsOpen]);

  const [layout, setLayout] = useState<LayoutRow[]>(() => {
    const base = parseSavedData(savedSections).layout;
    if (!twrData) return base;
    const hasPerf = base.some(row => row.ids.includes("performance"));
    if (hasPerf) return base;
    const afterSummary = base.findIndex(row => row.ids.includes("summary"));
    const insertAt = afterSummary >= 0 ? afterSummary + 1 : 0;
    const next = [...base];
    next.splice(insertAt, 0, { ids: ["performance"] });
    return next;
  });
  const [advisorComment, setAdvisorComment] = useState<string>(() => parseSavedData(savedSections).comment);
  const [editMode,       setEditMode]       = useState(false);

  const [dragIdx,      setDragIdx]      = useState<number | null>(null);
  const [dropIdx,      setDropIdx]      = useState<number | null>(null);
  const [dropMode,     setDropMode]     = useState<"reorder" | "pair">("reorder");
  const [dropPosition, setDropPosition] = useState<"above" | "below">("above");
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [panelDragId,  setPanelDragId]  = useState<SectionId | null>(null);
  const [endZoneActive, setEndZoneActive] = useState(false);

  useEffect(() => {
    const isDragging = dragIdx !== null || panelDragId !== null;
    if (!isDragging || !editMode) return;

    function onDragOver(e: DragEvent) { dragYRef.current = e.clientY; }

    function loop() {
      const y = dragYRef.current;
      if (y >= 0) {
        const ZONE = 110;
        const h    = window.innerHeight;
        if (y < ZONE) {
          window.scrollBy(0, -((1 - y / ZONE) * 18));
        } else if (y > h - ZONE) {
          window.scrollBy(0, ((y - (h - ZONE)) / ZONE) * 18);
        }
      }
      scrollRafRef.current = requestAnimationFrame(loop);
    }

    window.addEventListener("dragover", onDragOver);
    scrollRafRef.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      if (scrollRafRef.current !== null) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; }
      dragYRef.current = -1;
    };
  }, [dragIdx, panelDragId, editMode]);

  const activeSectionIds = layout.flatMap(r => r.ids);
  const hiddenSectionIds = ALL_SECTIONS.filter(id => !activeSectionIds.includes(id));

  // ── Layout manipulation ────────────────────────────────────────────────────

  function removeSection(rowIdx: number, sectionId: SectionId) {
    setLayout(prev => prev.flatMap((row, i) => {
      if (i !== rowIdx) return [row];
      const remaining = row.ids.filter(id => id !== sectionId);
      if (remaining.length === 0) return [];
      return [{ ids: [remaining[0] as SectionId] as [SectionId] }];
    }));
  }

  function splitRow(rowIdx: number) {
    setLayout(prev => prev.flatMap((row, i) => {
      if (i !== rowIdx || row.ids.length !== 2) return [row];
      return row.ids.map(id => ({ ids: [id] as [SectionId] }));
    }));
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function resetDrag() {
    setDragIdx(null);
    setDropIdx(null);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, rowIdx: number) {
    e.preventDefault();
    setEndZoneActive(false);
    setDropIdx(rowIdx);
    const rect = e.currentTarget.getBoundingClientRect();
    const relY  = (e.clientY - rect.top) / rect.height;
    if (relY > 0.3 && relY < 0.7) {
      setDropMode("pair");
    } else {
      setDropMode("reorder");
      setDropPosition(relY <= 0.3 ? "above" : "below");
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, toIdx: number) {
    e.preventDefault();

    if (panelDragId !== null) {
      const insertAt = dropPosition === "below" ? toIdx + 1 : toIdx;
      setLayout(prev => {
        const next = [...prev];
        next.splice(Math.min(insertAt, next.length), 0, { ids: [panelDragId] });
        return next;
      });
      setPanelDragId(null);
      setDropIdx(null);
      return;
    }

    if (dragIdx === null || dragIdx === toIdx) { resetDrag(); return; }

    if (dropMode === "pair") {
      const from = layout[dragIdx];
      const to   = layout[toIdx];
      const NO_PAIR: SectionId[] = [];
      const canPairThem =
        from.ids.length === 1 &&
        to.ids.length === 1 &&
        !NO_PAIR.includes(from.ids[0]) &&
        !NO_PAIR.includes(to.ids[0]);

      if (canPairThem) {
        const next       = layout.filter((_, i) => i !== dragIdx);
        const adjustedTo = toIdx > dragIdx ? toIdx - 1 : toIdx;
        next[adjustedTo] = { ids: [to.ids[0], from.ids[0]] };
        setLayout(next);
        resetDrag();
        return;
      }
    }

    const next = [...layout];
    const [item] = next.splice(dragIdx, 1);
    let insertAt = toIdx > dragIdx ? toIdx - 1 : toIdx;
    if (dropPosition === "below") insertAt += 1;
    next.splice(Math.max(0, Math.min(insertAt, next.length)), 0, item);
    setLayout(next);
    resetDrag();
  }

  function handleEndDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (panelDragId === null) return;
    setLayout(prev => [...prev, { ids: [panelDragId] }]);
    setPanelDragId(null);
    setEndZoneActive(false);
    setDropIdx(null);
  }

  // ── Save / share ───────────────────────────────────────────────────────────

  async function saveLayout() {
    if (!advisorId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res  = await fetch("/api/radgivning/portfolioanalysis/dashboard", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sections:    { rows: layout, comment: advisorComment },
          advisorCode: advisorId,
        }),
      });
      const json = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setSaveError(json.error ?? `HTTP ${res.status}`);
        setSaving(false);
        return;
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Nätverksfel");
      setSaving(false);
      return;
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function copyShareLink() {
    const q = new URLSearchParams({ name: portfolioName });
    if (advisorId) q.set("advisor", advisorId);
    if (linkTs)    q.set("ts",  linkTs);
    if (linkSig)   q.set("sig", linkSig);
    const url = `${location.origin}/radgivning/portfolioanalysis/${encodeURIComponent(urlSlug ?? portfolioId)}?${q}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleRefresh() {
    setBusy(true);
    const q = new URLSearchParams({ refresh: "1", name: portfolioName });
    if (advisorId) q.set("advisor", advisorId);
    router.push(`/radgivning/portfolioanalysis/${encodeURIComponent(urlSlug ?? portfolioId)}?${q}`);
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "#FAFAF8" }}>
        <div className="bg-white border border-[#F6F7F9] rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-10 flex gap-5 max-w-xl w-full">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertCircle className="text-red-500" size={18} />
          </div>
          <div>
            <p className="font-semibold text-[#1E2430] mb-1.5">Kunde inte hämta data</p>
            <p className="text-sm text-[#5B6472] break-all leading-relaxed">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#274C77] hover:text-[#1F3D61] transition-colors"
            >
              <RefreshCw size={13} /> Försök igen
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF8" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="border-b sticky top-0 z-50"
        style={{ borderColor: "#F0F2F5", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
      >
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between gap-4">

          <div className="flex items-center gap-4 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white select-none" style={{ background: "#274C77" }}>
              <Home className="w-4 h-4" />
            </div>
            {/* Tab navigation */}
            <div className="flex items-center bg-[#F0F2F5] rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("analysis")}
                className={cn(
                  "text-sm font-medium px-3 py-1.5 rounded-md transition-all",
                  activeTab === "analysis"
                    ? "bg-white shadow-sm"
                    : "hover:text-[#5B6472]",
                )}
                style={{ color: activeTab === "analysis" ? "#1E2430" : "#8D95A3" }}
              >
                Portföljanalys
              </button>
              <button
                onClick={() => setActiveTab("comparison")}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-all",
                  activeTab === "comparison"
                    ? "bg-white shadow-sm"
                    : "hover:text-[#5B6472]",
                )}
                style={{ color: activeTab === "comparison" ? "#1E2430" : "#8D95A3" }}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Jämförelseverktyg</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">

            {/* Documents */}
            <div ref={docsRef} className="relative">
              <button
                onClick={() => setDocsOpen(v => !v)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 transition-all",
                  docsOpen
                    ? "text-white"
                    : "hover:bg-[#F5F5F2]"
                )}
                style={docsOpen ? { background: "#274C77", color: "#fff" } : { color: "#5B6472" }}
              >
                <Paperclip className="w-4 h-4" />
                <span className="hidden sm:inline">Dokument</span>
                {docCount > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                    docsOpen ? "bg-white/20 text-white" : "bg-[#EEF4FF] text-[#274C77]"
                  )}>
                    {docCount}
                  </span>
                )}
              </button>
              {docsOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-[#F6F7F9] rounded-md shadow-xl overflow-hidden">
                  <DocumentsPanel portfolioId={portfolioId} onCountChange={setDocCount} />
                </div>
              )}
            </div>

            {/* Share */}
            {advisorId && (
              <button
                onClick={copyShareLink}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 transition-all",
                  copied ? "bg-emerald-500 text-white" : "hover:bg-[#F5F5F2]"
                )}
                style={!copied ? { color: "#5B6472" } : undefined}
              >
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? "Kopierat!" : "Dela länk"}</span>
              </button>
            )}

            {/* Save layout */}
            {canEdit && editMode && activeTab === "analysis" && (
              <button
                onClick={saveLayout}
                disabled={saving || !advisorId}
                title={!advisorId ? "Öppna via en rådgivarlänk för att spara" : undefined}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 border transition-all",
                  saved
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : saveError
                      ? "border-red-200 bg-red-50"
                      : !advisorId
                        ? "border-[#F6F7F9] cursor-not-allowed"
                        : "border-[#F6F7F9] hover:bg-[#F5F5F2] disabled:opacity-60"
                )}
                style={!saved && !saveError ? { color: !advisorId ? "#8D95A3" : "#5B6472" } : saveError ? { color: "#dc2626" } : undefined}
              >
                {saved
                  ? <><Check className="w-3.5 h-3.5" /> Sparat</>
                  : saving
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sparar…</>
                    : saveError
                      ? <><AlertCircle className="w-3.5 h-3.5" /> Fel</>
                      : <><Save className="w-3.5 h-3.5" /> Spara</>}
              </button>
            )}

            {/* Add sections */}
            {canEdit && editMode && activeTab === "analysis" && (
              <button
                onClick={() => setPanelOpen(v => !v)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 border transition-all",
                  panelOpen ? "text-white border-transparent" : "border-[#F6F7F9] hover:bg-[#F5F5F2]"
                )}
                style={panelOpen ? { background: "#274C77", color: "#fff" } : { color: "#5B6472" }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Sektioner</span>
                {hiddenSectionIds.length > 0 && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                    panelOpen ? "bg-white/20 text-white" : "bg-[#EEF4FF] text-[#274C77]"
                  )}>
                    {hiddenSectionIds.length}
                  </span>
                )}
              </button>
            )}

            {/* Customize toggle */}
            {canEdit && activeTab === "analysis" && (
              <button
                onClick={() => { setEditMode(v => !v); setPanelOpen(false); }}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 transition-all",
                  editMode ? "text-white" : "hover:bg-[#F5F5F2]"
                )}
                style={editMode ? { background: "#274C77", color: "#fff" } : { color: "#5B6472" }}
              >
                {editMode ? <X className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{editMode ? "Klar" : "Anpassa"}</span>
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={busy}
              className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg hover:bg-[#F5F5F2] transition-all disabled:opacity-50"
              style={{ color: "#5B6472" }}
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Uppdatera</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Hidden sections panel ──────────────────────────────────────────── */}
      {editMode && (
        <div
          ref={panelRef}
          className={cn(
            "fixed top-16 right-0 h-[calc(100vh-4rem)] w-52 bg-white border-l border-[#F6F7F9] shadow-2xl z-50 flex flex-col transition-transform duration-200",
            panelOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="px-4 py-4 border-b border-[#F6F7F9]">
            <p className="text-[11px] font-semibold text-[#8D95A3] uppercase tracking-widest">Dolda sektioner</p>
            <p className="text-xs text-[#8D95A3] mt-1">Dra till önskad position</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {hiddenSectionIds.length === 0 ? (
              <p className="text-xs text-[#8D95A3] text-center py-8">Alla sektioner är aktiva</p>
            ) : (
              hiddenSectionIds.map(id => (
                <div
                  key={id}
                  draggable
                  onDragStart={() => setPanelDragId(id)}
                  onDragEnd={() => { setPanelDragId(null); setDropIdx(null); setEndZoneActive(false); }}
                  className={cn(
                    "bg-[#FAFAF8] border border-[#F6F7F9] rounded-lg px-3 py-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing select-none hover:border-[#D8DEE8] hover:bg-[#F8F9FB] transition-colors",
                    panelDragId === id && "opacity-40"
                  )}
                >
                  <GripVertical className="w-3.5 h-3.5 text-[#8D95A3] shrink-0" />
                  <p className="text-xs font-medium text-[#5B6472]">{SECTION_LABELS[id]}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Comparison tool ────────────────────────────────────────────────── */}
      {activeTab === "comparison" && (
        <ComparisonTool
          portfolioName={portfolioName}
          data={data}
          twrData={twrData}
          managedPortfolio={managedPortfolio}
        />
      )}

      {/* ── Analysis view ──────────────────────────────────────────────────── */}
      {activeTab === "analysis" && <>

      {/* ── Portfolio heading — full-width gradient ────────────────────────── */}
      <div style={{ background: "#EEF4FF" }}>
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-12 sm:pt-16 pb-10 sm:pb-12">

          {/* Title */}
          <h1
            className="text-[40px] sm:text-[56px] leading-[1.06] mb-5 font-medium"
            style={{ fontFamily: "var(--font-dm-serif)", color: "#1E2430" }}
          >
            {portfolioName}
          </h1>

          {/* Metadata row */}
          <div className="flex items-center gap-2.5 flex-wrap mb-8 sm:mb-10">
            <span className="text-sm" style={{ color: "#8D95A3" }}>{data.holdings.length} innehav</span>
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#E5E7EB" }} />
            <span className="text-sm" style={{ color: "#8D95A3" }}>Senast uppdaterad {data.period.end}</span>
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#E5E7EB" }} />
            <span className="flex items-center gap-1 text-sm" style={{ color: "#8D95A3" }}>
              <Info className="w-3.5 h-3.5" />
              Morningstar
            </span>
            {canEdit && editMode && (
              <>
                <span className="w-1 h-1 rounded-full shrink-0" style={{ background: "#E5E7EB" }} />
                <span className="text-sm" style={{ color: "#8D95A3" }}>Dra sektioner för att ändra ordning</span>
              </>
            )}
          </div>

          {/* Stats strip */}
          {(() => {
            const equity = data.asset_allocation.find(a => a.category === "Aktier" || a.category === "Equity");
            const bond   = data.asset_allocation.find(a => a.category === "Räntor" || a.category === "Bond");
            const cash   = data.asset_allocation.find(a => a.category === "Kassa"  || a.category === "Cash");
            const eqPct  = equity?.percentage ?? 0;
            const risk   = eqPct < 20 ? 1 : eqPct < 35 ? 2 : eqPct < 55 ? 3 : eqPct < 75 ? 4 : 5;
            return (
              <div className="flex flex-wrap items-start gap-x-8 sm:gap-x-12 gap-y-6 pt-8 border-t" style={{ borderColor: "#E5E7EB" }}>
                <StatCell label="Antal innehav" value={`${data.holdings.length}`} />
                {equity && <StatCell label="Aktier" value={`${equity.percentage.toFixed(1)}%`} />}
                {bond   && <StatCell label="Räntor" value={`${bond.percentage.toFixed(1)}%`}   />}
                {cash   && <StatCell label="Kassa"  value={`${cash.percentage.toFixed(1)}%`}   />}
                {managedPortfolio?.fee != null && (
                  <StatCell label="Avgift" value={`${managedPortfolio.fee}%`} />
                )}
                {managedPortfolio?.risk_level != null
                  ? <RiskLevelCell level={managedPortfolio.risk_level} />
                  : <RiskLevelCell level={risk} />
                }
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10">

        {/* ── Commentary (server-rendered) ─────────────────────────────────── */}
        {commentary.length > 0 && <CommentarySection entries={commentary} />}

        {/* ── Layout sections ──────────────────────────────────────────────── */}
        {layout.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: "#8D95A3" }}>Inga sektioner valda.</p>
            {canEdit && (
              <button
                onClick={() => { setEditMode(true); setPanelOpen(true); }}
                className="mt-3 text-sm font-medium transition-colors"
                style={{ color: "#274C77" }}
              >
                Lägg till sektioner
              </button>
            )}
          </div>
        ) : (
          <div className="pb-20">
            {layout.map((row, rowIdx) => {
              const isPair           = row.ids.length === 2;
              const isAdvisorComment = !isPair && row.ids[0] === "advisor-comment";
              const isBeingDragged   = dragIdx === rowIdx;
              const isRowTarget      = dropIdx === rowIdx && !isBeingDragged &&
                                       (dragIdx !== null || panelDragId !== null);
              const canPair          = isRowTarget && dropMode === "pair" && !isPair &&
                                       dragIdx !== null && layout[dragIdx]?.ids.length === 1;

              return (
                <div
                  key={row.ids.join("+")}
                  className="animate-fade-in-up relative"
                  style={{ animationDelay: `${rowIdx * 55}ms` }}
                  onDragOver={e => handleDragOver(e, rowIdx)}
                  onDrop={e => handleDrop(e, rowIdx)}
                  onDragLeave={() => { if (dropIdx === rowIdx) setDropIdx(null); }}
                >
                  {/* Drop indicator line */}
                  {isRowTarget && !canPair && (
                    <div className={cn(
                      "absolute left-0 right-0 h-0.5 z-10 rounded-full pointer-events-none",
                      dropPosition === "above" ? "top-0" : "bottom-0"
                    )} style={{ background: "#274C77" }} />
                  )}

                  {/* Section */}
                  <div className={cn(
                    "transition-all duration-200 py-10 sm:py-12 rounded-lg",
                    isBeingDragged
                      ? "opacity-30"
                      : canPair
                        ? "bg-[#EEF4FF]/20"
                        : "",
                  )}>

                    {/* Pair hint */}
                    {canPair && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <span className="text-xs font-medium px-3 py-1.5 rounded-full border" style={{ background: "#EEF4FF", color: "#274C77", borderColor: "#A3CEF1" }}>
                          Lägg bredvid
                        </span>
                      </div>
                    )}

                    {isPair ? (
                      <>
                        {canEdit && (
                          <div
                            draggable={panelDragId === null}
                            onDragStart={() => setDragIdx(rowIdx)}
                            onDragEnd={resetDrag}
                            className="grid sm:grid-cols-2 gap-10 sm:gap-16 mb-0 cursor-grab active:cursor-grabbing select-none"
                          >
                            {row.ids.map((id, colIdx) => (
                              <SectionCardHeader
                                key={id}
                                id={id}
                                data={data}
                                rowIdx={rowIdx}
                                editMode={editMode}
                                canEdit={canEdit}
                                isPair={true}
                                colIdx={colIdx}
                                onDragStart={() => setDragIdx(rowIdx)}
                                onDragEnd={resetDrag}
                                onRemove={() => removeSection(rowIdx, id)}
                                onSplit={colIdx === 0 ? () => splitRow(rowIdx) : undefined}
                                panelDragId={panelDragId}
                              />
                            ))}
                          </div>
                        )}
                        {!canEdit && (
                          <div className="grid sm:grid-cols-2 gap-10 sm:gap-16">
                            {row.ids.map(id => (
                              <div key={id} className="pb-4 mb-7 border-b border-[#E5E7EB]">
                                <span className="text-sm font-semibold tracking-[0.08em] uppercase text-[#5B6472]">
                                  {SECTION_LABELS[id]}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid sm:grid-cols-2 gap-10 sm:gap-16 items-start">
                          {row.ids.map(id =>
                            id === "advisor-comment"
                              ? <AdvisorCommentSection key={id} value={advisorComment} onChange={setAdvisorComment} canEdit={canEdit} />
                              : <SectionData key={id} id={id} data={data} twrData={twrData} />
                          )}
                        </div>
                      </>

                    ) : isAdvisorComment ? (
                      <>
                        <SectionCardHeader
                          id="advisor-comment"
                          data={data}
                          rowIdx={rowIdx}
                          editMode={editMode}
                          canEdit={canEdit}
                          isPair={false}
                          onDragStart={() => setDragIdx(rowIdx)}
                          onDragEnd={resetDrag}
                          onRemove={() => removeSection(rowIdx, "advisor-comment")}
                          panelDragId={panelDragId}
                        />
                        <AdvisorCommentSection
                          value={advisorComment}
                          onChange={setAdvisorComment}
                          canEdit={canEdit}
                        />
                      </>

                    ) : (
                      <>
                        <SectionCardHeader
                          id={row.ids[0]}
                          data={data}
                          rowIdx={rowIdx}
                          editMode={editMode}
                          canEdit={canEdit}
                          isPair={false}
                          onDragStart={() => setDragIdx(rowIdx)}
                          onDragEnd={resetDrag}
                          onRemove={() => removeSection(rowIdx, row.ids[0])}
                          panelDragId={panelDragId}
                        />
                        <SectionData id={row.ids[0]} data={data} twrData={twrData} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── End drop zone ─────────────────────────────────────────────────── */}
        {panelDragId !== null && (
          <div
            onDragOver={e => { e.preventDefault(); setEndZoneActive(true); setDropIdx(null); }}
            onDragLeave={() => setEndZoneActive(false)}
            onDrop={handleEndDrop}
            className={cn(
              "flex items-center justify-center rounded-md border-2 border-dashed transition-all mb-6",
              endZoneActive
                ? "h-16 border-[#274C77] bg-[#EEF4FF]/40"
                : "h-10 border-[#F6F7F9]"
            )}
          >
            {endZoneActive && (
              <span className="text-xs font-medium" style={{ color: "#274C77" }}>Lägg till sist</span>
            )}
          </div>
        )}
      </div>
    </>}

    </div>
  );
}
