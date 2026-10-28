/**
 * Report exports — CSV download and branded print-to-PDF.
 * Both respect the filters active in the Reports module: callers pass the
 * already-scoped rows, so exports always match what is on screen.
 */
import { QUALITY_META, type Metric, type Quality } from "@/lib/reports-data";

export type CsvCell = string | number | null | undefined;
export type CsvTable = { title: string; headers: string[]; rows: CsvCell[][] };

const csvEscape = (v: CsvCell): string => {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Build and trigger a CSV download (opens directly in Excel / Sheets). */
export function downloadCsv(filename: string, tables: CsvTable[], periodLabel: string) {
  const lines: string[] = [];
  lines.push(`LoadLink — ${filename}`);
  lines.push(`Period: ${periodLabel}`);
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  for (const t of tables) {
    lines.push("");
    lines.push(csvEscape(t.title));
    lines.push(t.headers.map(csvEscape).join(","));
    for (const r of t.rows) lines.push(r.map(csvEscape).join(","));
  }
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename.replace(/[^\w -]+/g, "").replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type PdfKpi = { label: string; value: string; quality?: Quality };

const kSh = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

/**
 * Branded print-to-PDF: opens a styled print window the user saves as PDF.
 * Uses the Emerald Prestige palette so exports carry LoadLink branding.
 */
export function printReport(opts: {
  title: string;
  periodLabel: string;
  kpis: PdfKpi[];
  tables: CsvTable[];
  notes?: string[];
}) {
  const w = window.open("", "_blank", "width=960,height=760");
  if (!w) return false;

  const kpiCards = opts.kpis
    .map((k) => `
      <div class="kpi">
        <div class="kpi-label">${esc(k.label)}${k.quality && k.quality !== "actual" ? ` · ${QUALITY_META[k.quality].label}` : ""}</div>
        <div class="kpi-value">${esc(k.value)}</div>
      </div>`)
    .join("");

  const tableHtml = opts.tables
    .map((t) => `
      <h2>${esc(t.title)}</h2>
      ${t.rows.length ? `
      <table>
        <thead><tr>${t.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>
          ${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c == null ? "" : String(c))}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>` : `<p class="empty">No data available for this period.</p>`}`)
    .join("");

  const notes = opts.notes?.length
    ? `<div class="notes">${opts.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>`
    : "";

  w.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>LoadLink — ${esc(opts.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; color: #1a2b24; margin: 32px; }
  .brand { display: flex; align-items: baseline; gap: 10px; border-bottom: 3px solid #0b3d2e; padding-bottom: 12px; }
  .brand h1 { font-size: 22px; letter-spacing: -0.02em; margin: 0; color: #0b3d2e; }
  .brand .dot { color: #c9a227; }
  .meta { color: #5b6f66; font-size: 12px; margin-top: 6px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
  .kpi { border: 1px solid #dfe8e3; border-radius: 10px; padding: 10px 12px; }
  .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #5b6f66; }
  .kpi-value { font-size: 17px; font-weight: 700; margin-top: 3px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #0b3d2e; margin: 20px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; border-bottom: 2px solid #0b3d2e; padding: 6px 8px; font-size: 11px; }
  td { border-bottom: 1px solid #e7eeea; padding: 6px 8px; }
  .empty { color: #5b6f66; font-size: 12px; font-style: italic; }
  .notes { margin-top: 18px; border-top: 1px solid #dfe8e3; padding-top: 10px; }
  .notes p { font-size: 11px; color: #5b6f66; margin: 3px 0; }
  .foot { margin-top: 24px; font-size: 10px; color: #8aa196; }
  @media print { body { margin: 14mm; } }
</style></head><body>
  <div class="brand"><h1>LoadLink<span class="dot">.</span></h1><div>${esc(opts.title)}</div></div>
  <div class="meta">Period: ${esc(opts.periodLabel)} · Generated ${new Date().toLocaleString()}</div>
  <div class="kpis">${kpiCards}</div>
  ${tableHtml}
  ${notes}
  <div class="foot">Figures marked Estimated are derived from quoted or partial data; Unavailable means no source data was captured. Currency: Kenyan Shilling (KSh).</div>
</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 350);
  return true;
}

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

/** Convenience for KPI building from a Metric. */
export function kpiFrom(m: Metric, format: (n: number) => string, label: string): PdfKpi {
  return { label, value: format(m.value), quality: m.quality };
}

export { kSh as formatKSh };
