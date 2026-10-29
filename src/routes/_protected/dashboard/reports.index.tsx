import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth-context";
import {
  SectionTabs, FilterBar, FilterSheet, KpiGrid, MetricTile, MetricTileM, ChartCard, RankRows,
  ExportButtons, DataNote, SkeletonGrid, fmtKSh, fmtNum, fmtPct, fmtKm, ROLE_SECTIONS,
  type SectionKey,
} from "@/components/reports/ReportsUI";
import {
  useReportsScope, csvSeries, csvKpis, pdfKpis,
} from "@/components/reports/reports-scope";
import {
  overviewKpis, revenueOverTime, revenueByClient, revenueByVehicle, orderAnalytics,
} from "@/lib/reports-data";
import { ORDER_STATUS_META } from "@/lib/orders-data";

export const Route = createFileRoute("/_protected/dashboard/reports/")({
  component: ReportsOverview,
  head: () => ({
    meta: [
      { title: "Reports & Business Intelligence · LoadLink" },
      { name: "description", content: "Revenue, fleet, driver, client and delivery analytics for your LoadLink operation." },
      { property: "og:title", content: "Reports & Business Intelligence · LoadLink" },
      { property: "og:description", content: "Revenue, fleet, driver, client and delivery analytics for your LoadLink operation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ReportsOverview() {
  const { role } = useAuth();
  const allowed = (ROLE_SECTIONS[role ?? ""] ?? []) as SectionKey[];

  if (!allowed.includes("overview")) {
    return (
      <DashboardShell title="Reports" role="Business intelligence">
        <div className="card-elevated p-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-secondary grid place-items-center mb-3">
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="font-display font-semibold">Reports are not available for your role.</div>
          <p className="text-sm text-muted-foreground mt-1">
            Ask your company administrator if you believe you should have access.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return <OverviewBody role={role ?? ""} allowed={allowed} />;
}

function OverviewBody({ role, allowed }: { role: string; allowed: SectionKey[] }) {
  const { dataset, scoped, loading, filters, setFilters, resetFilters, range } = useReportsScope();
  const [sheetOpen, setSheetOpen] = useState(false);
  const k = useMemo(() => overviewKpis(scoped), [scoped]);
  const analytics = useMemo(() => orderAnalytics(scoped), [scoped]);
  const overTime = useMemo(() => revenueOverTime(scoped, range), [scoped, range]);
  const byClient = useMemo(() => revenueByClient(scoped), [scoped]);
  const byVehicle = useMemo(() => revenueByVehicle(scoped), [scoped]);

  const staff = role === "admin" || role === "fleet" || role === "dispatcher";
  const statusSeries = analytics.byStatus.map(({ status, count }) => ({
    label: ORDER_STATUS_META[status]?.label ?? status,
    value: count,
  }));

  const kpiRows = [
    { label: "Revenue", m: k.revenue, format: fmtKSh },
    { label: "Collected", m: k.paidRevenue, format: fmtKSh },
    { label: "Outstanding", m: k.outstanding, format: fmtKSh },
    { label: "Avg order value", m: k.avgOrderValue, format: fmtKSh },
    { label: "Expenses", m: k.expenses, format: fmtKSh },
    { label: "Gross profit", m: k.profit, format: fmtKSh },
    { label: "Margin", m: k.margin, format: fmtPct },
    { label: "Fleet utilisation", m: k.fleetUtilization, format: fmtPct },
    { label: "Distance covered", m: k.distanceKm, format: fmtKm },
  ];

  return (
    <DashboardShell title="Reports" role={`${range.label} · business intelligence`}>
      <div className="space-y-3">
        <SectionTabs current="overview" allowed={allowed as SectionKey[]} />
        <FilterBar filters={filters} dataset={dataset} onOpen={() => setSheetOpen(true)} />
        <FilterSheet
          open={sheetOpen} onClose={() => setSheetOpen(false)}
          filters={filters} dataset={dataset} onApply={setFilters} onReset={resetFilters}
        />

        {loading ? (
          <SkeletonGrid rows={5} />
        ) : scoped.orders.length === 0 && scoped.payments.length === 0 && scoped.expenses.length === 0 ? (
          <div className="card-elevated p-6 text-center">
            <div className="font-display font-semibold">No data available for this period.</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Nothing recorded for {range.label} between the selected dates. Try a longer period or clear the filters.
            </p>
          </div>
        ) : (
          <>
            <KpiGrid>
              <MetricTileM label="Revenue" m={k.revenue} format={fmtKSh} />
              <MetricTileM label="Collected" m={k.paidRevenue} format={fmtKSh} />
              <MetricTileM label="Outstanding" m={k.outstanding} format={fmtKSh} />
              <MetricTileM label="Avg order value" m={k.avgOrderValue} format={fmtKSh} />
              <MetricTile label="Orders" value={fmtNum(k.orders)} hint={`${fmtNum(k.completed)} completed · ${fmtNum(k.active)} active`} />
              <MetricTile label="Cancelled" value={fmtNum(k.cancelled)} />
              <MetricTileM label="Fleet utilisation" m={k.fleetUtilization} format={fmtPct} />
              <MetricTileM label="Expenses" m={k.expenses} format={fmtKSh} />
              <MetricTileM label="Gross profit" m={k.profit} format={fmtKSh} />
              <MetricTileM label="Margin" m={k.margin} format={fmtPct} />
              <MetricTileM label="Distance covered" m={k.distanceKm} format={fmtKm} />
            </KpiGrid>

            <div className="flex items-center justify-end">
              <ExportButtons
                name={`Reports overview — ${range.label}`}
                periodLabel={range.label}
                getCsv={() => [csvKpis(kpiRows), csvSeries("Revenue over time", overTime), csvSeries("Revenue by client", byClient)]}
                getPdf={() => ({
                  kpis: pdfKpis(kpiRows),
                  tables: [csvSeries("Revenue over time", overTime), csvSeries("Revenue by client", byClient), csvSeries("Revenue by vehicle", byVehicle)],
                  notes: k.revenue.quality !== "actual"
                    ? ["Revenue on orders without a final invoice total is estimated from quoted amounts."]
                    : undefined,
                })}
              />
            </div>

            <ChartCard title="Revenue over time" series={overTime} kind="trend" format={fmtKSh}
              badge={k.revenue.quality !== "actual" ? k.revenue.quality : undefined} />
            <ChartCard title="Revenue by client" series={byClient.slice(0, 8)} format={fmtKSh} />
            <ChartCard title="Orders by status" series={statusSeries} format={fmtNum} />

            {staff && (
              <div className="card-elevated p-4">
                <h3 className="font-display text-sm font-semibold mb-1">Top clients</h3>
                <RankRows series={byClient.slice(0, 8)} format={fmtKSh}
                  linkFor={(s) => (s.id && (role === "admin" || role === "fleet") ? `/dashboard/fleet/clients/${s.id}` : null)} />
              </div>
            )}

            {staff && (
              <div className="card-elevated p-4">
                <h3 className="font-display text-sm font-semibold mb-1">Top vehicles by revenue</h3>
                <RankRows series={byVehicle.slice(0, 8)} format={fmtKSh}
                  linkFor={(s) => (s.id && staff ? `/dashboard/fleet/vehicles/${s.id}` : null)} />
              </div>
            )}

            {k.revenue.quality === "estimated" && (
              <DataNote>
                Some orders in this period have no final invoice total yet, so their revenue is estimated from the
                quoted amount. Figures become actual once invoices are issued.
              </DataNote>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
