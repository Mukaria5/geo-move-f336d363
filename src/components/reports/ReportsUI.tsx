/**
 * Reports shared chrome: section tabs, period picker, filter bottom sheet,
 * KPI tiles, charts, ranking rows, quality badges and empty states.
 * Every component is presentation-only — all figures come from the callers.
 */
import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BarChart3, Building2, ChevronRight, Clock, Download, FileSpreadsheet, Fuel, LayoutDashboard,
  Package, Receipt, SlidersHorizontal, Timer, TrendingUp, Truck, Users, Wallet, X,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  DEFAULT_FILTERS, PERIODS, QUALITY_META, activeFilterCount, periodRange,
  type Metric, type PeriodKey, type Quality, type ReportDataset, type ReportFilters, type Series,
} from "@/lib/reports-data";
import type { OrderStatus } from "@/lib/orders-data";
import { ORDER_STATUS_META } from "@/lib/orders-data";
import { downloadCsv, printReport, type CsvTable } from "@/lib/reports-export";

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

export type SectionKey =
  | "overview" | "revenue" | "orders" | "fleet" | "drivers"
  | "clients" | "expenses" | "profitability" | "fuel" | "delivery";

export const REPORT_SECTIONS: { key: SectionKey; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "revenue", label: "Revenue", icon: Wallet },
  { key: "orders", label: "Orders", icon: Package },
  { key: "fleet", label: "Fleet", icon: Truck },
  { key: "drivers", label: "Drivers", icon: Users },
  { key: "clients", label: "Clients", icon: Building2 },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "profitability", label: "Profitability", icon: TrendingUp },
  { key: "fuel", label: "Fuel", icon: Fuel },
  { key: "delivery", label: "Delivery", icon: Timer },
];

export const ALL_SECTIONS = REPORT_SECTIONS.map((s) => s.key);

/** Role-scoped section access — mirrored by nav-modules.ts. */
export const ROLE_SECTIONS: Record<string, SectionKey[]> = {
  admin: ALL_SECTIONS,
  fleet: ALL_SECTIONS,
  dispatcher: ["overview", "orders", "fleet", "drivers", "fuel", "delivery"],
  driver: ["overview", "orders", "delivery"],
  client: ["overview", "orders", "revenue", "delivery"],
};

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const fmtKSh = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `KSh ${(n / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}M`;
  if (a >= 1_000) return `KSh ${(n / 1_000).toFixed(a >= 100_000 ? 0 : 1)}K`;
  return `KSh ${Math.round(n)}`;
};

export const fmtFull = (n: number): string => `KSh ${Math.round(n).toLocaleString()}`;
export const fmtNum = (n: number): string => Math.round(n).toLocaleString();
export const fmtPct = (n: number): string => `${Math.round(n)}%`;

export const fmtMin = (m: number | null): string => {
  if (m == null) return "—";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

export const fmtKm = (n: number): string => `${Math.round(n).toLocaleString()} km`;

/* ------------------------------------------------------------------ */
/* Search-param persistence                                            */
/* ------------------------------------------------------------------ */

export type ReportsSearchParams = {
  period?: string;
  from?: string;
  to?: string;
  vehicle?: string;
  driver?: string;
  client?: string;
  status?: string;
  branch?: string;
  type?: string;
};

const isPeriodKey = (v: string | undefined): v is PeriodKey =>
  !!v && PERIODS.some((p) => p.key === v);

export function filtersFromSearch(s: ReportsSearchParams): ReportFilters {
  return {
    period: isPeriodKey(s.period) ? s.period : "month",
    from: s.from ?? null,
    to: s.to ?? null,
    vehicleId: s.vehicle ?? null,
    driverId: s.driver ?? null,
    clientId: s.client ?? null,
    status: (s.status as OrderStatus | undefined) ?? "all",
    branch: s.branch ?? null,
    vehicleType: s.type ?? null,
  };
}

export function filtersToSearch(f: ReportFilters): ReportsSearchParams {
  return {
    period: f.period !== DEFAULT_FILTERS.period ? f.period : undefined,
    from: f.from ?? undefined,
    to: f.to ?? undefined,
    vehicle: f.vehicleId ?? undefined,
    driver: f.driverId ?? undefined,
    client: f.clientId ?? undefined,
    status: f.status !== "all" ? f.status : undefined,
    branch: f.branch ?? undefined,
    type: f.vehicleType ?? undefined,
  };
}

/** Hook used by every Reports page: filters live in the URL, so they persist across sections. */
export function useReportFilters() {
  const search = useSearch({ strict: false }) as ReportsSearchParams;
  // Loose typing: filters are written from shared components across sections.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigate = useNavigate() as (opts: any) => Promise<void>;
  const filters = useMemo(() => filtersFromSearch(search), [search]);
  const setFilters = (patch: Partial<ReportFilters>) => {
    const next = filtersToSearch({ ...filters, ...patch });
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, ...next }), replace: true });
  };
  const resetFilters = () => {
    navigate({ search: { period: DEFAULT_FILTERS.period }, replace: true });
  };
  return { filters, setFilters, resetFilters, range: useMemo(() => periodRange(filters.period, filters.from, filters.to), [filters]) };
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/** Actual data stays unmarked; estimated / unavailable are always surfaced. */
export function QualityBadge({ quality }: { quality: Quality }) {
  if (quality === "actual") return null;
  const m = QUALITY_META[quality];
  return (
    <span
      className={`text-[9px] leading-none px-1.5 py-1 rounded-full font-semibold whitespace-nowrap ${m.chip}`}
      title={m.note}
    >
      {m.label}
    </span>
  );
}

export function MetricTile({ label, value, quality, hint }: {
  label: string; value: string; quality?: Quality; hint?: string;
}) {
  return (
    <div className="card-elevated p-3.5 min-w-0">
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground truncate">{label}</span>
        {quality && <QualityBadge quality={quality} />}
      </div>
      <div className="font-display text-lg sm:text-xl font-semibold mt-1 tabular-nums truncate" title={value}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

export function MetricTileM({ label, m, format }: { label: string; m: Metric; format: (n: number) => string }) {
  return <MetricTile label={label} value={m.quality === "unavailable" ? "—" : format(m.value)} quality={m.quality} />;
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{children}</div>;
}

export function SectionCard({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

const CHART_GREEN = "var(--primary)";
const CHART_GRID = "color-mix(in oklab, var(--border) 70%, transparent)";

function ChartTooltip({ format }: { format: (n: number) => string }) {
  return (
    <Tooltip
      formatter={(v: number | string) => format(Number(v))}
      contentStyle={{
        borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)",
        fontSize: 12, color: "var(--foreground)", boxShadow: "var(--shadow-soft)",
      }}
      cursor={{ fill: "color-mix(in oklab, var(--secondary) 60%, transparent)" }}
    />
  );
}

/** Horizontal-scroll chart card; series are already filter-scoped. */
export function ChartCard({ title, series, kind = "bar", format = fmtKSh, badge }: {
  title: string;
  series: Series;
  kind?: "bar" | "trend";
  format?: (n: number) => string;
  badge?: Quality;
}) {
  if (!series.length) return null;
  const data = series.map((s) => ({ name: s.label, value: s.value, sub: s.sub ?? "" }));
  const chart = kind === "trend" ? (
    <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
      <defs>
        <linearGradient id="llArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.28} />
          <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid stroke={CHART_GRID} vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={52}
        tickFormatter={(v: number) => format(v).replace("KSh ", "")} />
      {ChartTooltip({ format })}
      <Area type="monotone" dataKey="value" stroke={CHART_GREEN} strokeWidth={2} fill="url(#llArea)" />
    </AreaChart>
  ) : (
    <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
      <CartesianGrid stroke={CHART_GRID} vertical={false} />
      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false}
        interval={0} angle={series.length > 6 ? -35 : 0} textAnchor={series.length > 6 ? "end" : "middle"} height={series.length > 6 ? 44 : 24} />
      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={52}
        tickFormatter={(v: number) => format(v).replace("KSh ", "")} />
      {ChartTooltip({ format })}
      <Bar dataKey="value" fill={CHART_GREEN} radius={[6, 6, 0, 0]} maxBarSize={38} />
    </BarChart>
  );

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {badge && <QualityBadge quality={badge} />}
      </div>
      <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div style={{ minWidth: Math.max(320, series.length * 52) }} className="h-44">
          <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking rows with drill-down                                        */
/* ------------------------------------------------------------------ */

/** Typed escape hatch for drill-down links built from data. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyLink = Link as ComponentType<any>;

export function RankRows({ series, format = fmtKSh, maxRows = 8, linkFor, suffix }: {
  series: Series;
  format?: (n: number) => string;
  maxRows?: number;
  /** Returns a drill-down href for the row, or null when not linkable. */
  linkFor?: (s: Series[number]) => string | null;
  suffix?: string;
}) {
  if (!series.length) return null;
  const max = Math.max(...series.map((s) => s.value), 1);
  const shown = series.slice(0, maxRows);
  return (
    <div className="divide-y divide-border/60">
      {shown.map((s, i) => {
        const href = linkFor?.(s) ?? null;
        const body = (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span>
                <span className="text-sm font-medium truncate">{s.label}</span>
              </div>
              {s.sub && <div className="text-[11px] text-muted-foreground truncate pl-5.5">{s.sub}</div>}
              <div className="mt-1 ml-5 h-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary/70 rounded-full" style={{ width: `${Math.max(2, (s.value / max) * 100)}%` }} />
              </div>
            </div>
            <div className="text-sm font-semibold tabular-nums shrink-0 text-right">
              {format(s.value)}{suffix ? <span className="text-[10px] text-muted-foreground font-normal"> {suffix}</span> : null}
            </div>
            {href && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          </>
        );
        return href ? (
          <AnyLink key={`${s.id ?? s.label}-${i}`} to={href} className="flex items-center gap-3 py-2.5 press">
            {body}
          </AnyLink>
        ) : (
          <div key={`${s.id ?? s.label}-${i}`} className="flex items-center gap-3 py-2.5">{body}</div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section tabs                                                        */
/* ------------------------------------------------------------------ */

export function SectionTabs({ current, allowed }: { current: SectionKey; allowed: SectionKey[] }) {
  const search = useSearch({ strict: false }) as ReportsSearchParams;
  return (
    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-4 px-4">
      <div className="flex gap-1.5 w-max pb-1">
        {REPORT_SECTIONS.filter((s) => allowed.includes(s.key)).map((s) => {
          const active = s.key === current;
          const Icon = s.icon;
          return (
            <AnyLink
              key={s.key}
              to={s.key === "overview" ? "/dashboard/reports" : `/dashboard/reports/${s.key}`}
              search={search}
              className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap press border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-soft"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
            </AnyLink>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Period chips + filter sheet                                         */
/* ------------------------------------------------------------------ */

export function FilterBar({ filters, dataset, onOpen }: {
  filters: ReportFilters;
  dataset: ReportDataset;
  onOpen: () => void;
}) {
  const n = activeFilterCount(filters);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-1.5 w-max">
          {PERIODS.filter((p) => p.key !== "custom" || filters.period === "custom").map((p) => {
            const active = filters.period === p.key;
            return (
              <PeriodChip key={p.key} label={p.label} active={active}
                onClick={() => p.key === "custom" ? onOpen() : undefined}
                disabled={p.key === "custom"} />
            );
          })}
        </div>
      </div>
      <button
        onClick={onOpen}
        className={`relative h-9 shrink-0 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 press border ${
          n ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
        }`}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Filters
        {n > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[#c9a227] text-[9px] font-bold text-primary-foreground grid place-items-center">
            {n}
          </span>
        )}
      </button>
    </div>
  );
}

function PeriodChip({ label, active, onClick, disabled }: {
  label: string; active: boolean; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-9 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap press border ${
        active ? "bg-primary text-primary-foreground border-primary shadow-soft" : "bg-card text-muted-foreground border-border"
      } ${disabled && !active ? "opacity-0 pointer-events-none absolute" : ""}`}
    >
      {label}
    </button>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30";

export function FilterSheet({ open, onClose, filters, dataset, onApply, onReset }: {
  open: boolean;
  onClose: () => void;
  filters: ReportFilters;
  dataset: ReportDataset;
  onApply: (f: ReportFilters) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<ReportFilters>(filters);
  // Re-seed the draft each time the sheet opens so it always reflects the URL.
  const [seed, setSeed] = useState("");
  const key = `${open}-${filters.period}-${filters.vehicleId ?? ""}-${filters.driverId ?? ""}-${filters.clientId ?? ""}-${filters.status}-${filters.branch ?? ""}-${filters.vehicleType ?? ""}`;
  if (open && seed !== key) { setSeed(key); setDraft(filters); }

  const branchOptions = useMemo(
    () => [...new Set([...dataset.vehicles.map((v) => v.branch), ...dataset.drivers.map((d) => d.branch)].filter(Boolean))] as string[],
    [dataset.vehicles, dataset.drivers],
  );
  const typeOptions = useMemo(
    () => [...new Set(dataset.vehicles.map((v) => v.vehicle_type).filter(Boolean))] as string[],
    [dataset.vehicles],
  );

  const clearOnly = () => setDraft({ ...DEFAULT_FILTERS, period: draft.period, from: draft.from, to: draft.to });
  const apply = () => { onApply(draft); onClose(); };

  return (
    <BottomSheet open={open} onClose={onClose} title="Filters & period" maxHeight="88vh">
      <div className="px-5 pb-2 overflow-y-auto space-y-4" style={{ maxHeight: "calc(88vh - 120px)" }}>
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Period</div>
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setDraft((d) => ({ ...d, period: p.key }))}
                className={`h-8 px-3 rounded-full text-xs font-semibold press border ${
                  draft.period === p.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {draft.period === "custom" && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="text-[11px] text-muted-foreground">
                From
                <input type="date" className={inputCls} value={draft.from ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value || null }))} />
              </label>
              <label className="text-[11px] text-muted-foreground">
                To
                <input type="date" className={inputCls} value={draft.to ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value || null }))} />
              </label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-[11px] text-muted-foreground">
            Vehicle
            <select className={inputCls} value={draft.vehicleId ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, vehicleId: e.target.value || null }))}>
              <option value="">All vehicles</option>
              {dataset.vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}{v.truck_model ? ` · ${v.truck_model}` : ""}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-muted-foreground">
            Driver
            <select className={inputCls} value={draft.driverId ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, driverId: e.target.value || null }))}>
              <option value="">All drivers</option>
              {dataset.drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-muted-foreground">
            Client
            <select className={inputCls} value={draft.clientId ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, clientId: e.target.value || null }))}>
              <option value="">All clients</option>
              {dataset.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-muted-foreground">
            Order status
            <select className={inputCls} value={draft.status}
              onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as OrderStatus | "all" }))}>
              <option value="all">All statuses</option>
              {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>{ORDER_STATUS_META[s].label}</option>
              ))}
            </select>
          </label>
          {branchOptions.length > 0 && (
            <label className="text-[11px] text-muted-foreground">
              Branch
              <select className={inputCls} value={draft.branch ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, branch: e.target.value || null }))}>
                <option value="">All branches</option>
                {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          )}
          {typeOptions.length > 0 && (
            <label className="text-[11px] text-muted-foreground">
              Vehicle type
              <select className={inputCls} value={draft.vehicleType ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, vehicleType: e.target.value || null }))}>
                <option value="">All vehicle types</option>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border flex items-center gap-2 bg-card">
        <button onClick={clearOnly} className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground press">
          Clear
        </button>
        <button onClick={() => { onReset(); onClose(); }}
          className="h-10 px-4 rounded-xl text-xs font-semibold text-muted-foreground press inline-flex items-center gap-1.5">
          <X className="h-3.5 w-3.5" /> Reset
        </button>
        <button onClick={apply}
          className="ml-auto h-10 px-6 rounded-xl bg-primary text-primary-foreground text-xs font-semibold press shadow-soft">
          Save
        </button>
      </div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Export buttons                                                      */
/* ------------------------------------------------------------------ */

export function ExportButtons({ name, periodLabel, getCsv, getPdf }: {
  name: string;
  periodLabel: string;
  getCsv: () => CsvTable[];
  getPdf: () => { kpis: Parameters<typeof printReport>[0]["kpis"]; tables: CsvTable[]; notes?: string[] };
}) {
  const [done, setDone] = useState<string | null>(null);
  const flash = (what: string) => { setDone(what); setTimeout(() => setDone(null), 1800); };

  return (
    <div className="flex items-center gap-2">
      {done && (
        <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
          className="text-[11px] font-medium text-primary">
          {done}
        </motion.span>
      )}
      <button
        onClick={() => { downloadCsv(name, getCsv(), periodLabel); flash("CSV saved"); }}
        className="h-9 px-3 rounded-full border border-border bg-card text-xs font-semibold inline-flex items-center gap-1.5 press"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
      </button>
      <button
        onClick={() => {
          const p = getPdf();
          const ok = printReport({ title: name, periodLabel, kpis: p.kpis, tables: p.tables, notes: p.notes });
          if (ok) flash("Print / PDF opened");
        }}
        className="h-9 px-3 rounded-full border border-border bg-card text-xs font-semibold inline-flex items-center gap-1.5 press"
      >
        <Download className="h-3.5 w-3.5" /> PDF
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

export function EmptyForPeriod({ what }: { what: string }) {
  return (
    <div className="card-elevated p-6 text-center">
      <div className="mx-auto h-12 w-12 rounded-2xl bg-secondary grid place-items-center mb-3">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="font-display font-semibold">No data available for this period.</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        Nothing recorded for {what} between the selected dates. Try a longer period or clear the filters.
      </p>
    </div>
  );
}

export function DataNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/60 rounded-xl px-3 py-2">
      <span className="mt-0.5 shrink-0"><BarChart3 className="h-3 w-3" /></span>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

export function SkeletonGrid({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
    </div>
  );
}
