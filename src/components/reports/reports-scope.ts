/**
 * Shared scope helpers for the Reports routes: combines the role-scoped
 * dataset hook with the URL-persisted filters and builds export payloads.
 */
import { useMemo } from "react";
import { useReportsDataset } from "@/components/reports/use-reports-data";
import { useReportFilters } from "@/components/reports/ReportsUI";
import {
  scopeDataset, overviewKpis, type DateRange, type Metric, type ReportDataset, type Series,
} from "@/lib/reports-data";
import { kpiFrom, type CsvTable, type PdfKpi } from "@/lib/reports-export";

export function useReportsScope() {
  const { dataset, loading } = useReportsDataset();
  const { filters, setFilters, resetFilters, range } = useReportFilters();
  const scoped = useMemo(() => scopeDataset(dataset, filters, range), [dataset, filters, range]);
  return { dataset, scoped, loading, filters, setFilters, resetFilters, range };
}

export const csvSeries = (title: string, s: Series, valueHeader = "Value"): CsvTable => ({
  title,
  headers: ["Label", valueHeader],
  rows: s.map((r) => [r.label, r.value]),
});

export const csvKpis = (rows: { label: string; m: Metric; format: (n: number) => string }[]): CsvTable => ({
  title: "Key figures",
  headers: ["Metric", "Value"],
  rows: rows.map((r) => [r.label, r.m.quality === "unavailable" ? "unavailable" : r.format(r.m.value)]),
});

export const pdfKpis = (rows: { label: string; m: Metric; format: (n: number) => string }[]): PdfKpi[] =>
  rows.map((r) => kpiFrom(r.m, r.format, r.label));

export type { Metric, ReportDataset, DateRange, Series };
export { overviewKpis };
