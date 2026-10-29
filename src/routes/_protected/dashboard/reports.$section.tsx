import { useMemo, useState } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth-context";
import {
  SectionTabs, FilterBar, FilterSheet, KpiGrid, MetricTile, MetricTileM, ChartCard, RankRows,
  SectionCard, ExportButtons, EmptyForPeriod, DataNote, SkeletonGrid,
  fmtKSh, fmtFull, fmtNum, fmtPct, fmtMin, fmtKm, ROLE_SECTIONS, REPORT_SECTIONS, ALL_SECTIONS,
  type SectionKey,
} from "@/components/reports/ReportsUI";
import { useReportsScope, csvSeries, csvKpis, pdfKpis } from "@/components/reports/reports-scope";
import {
  overviewKpis, orderAnalytics, deliveryPerformance, vehicleReport, fleetSummary,
  driverReport, clientReport, profitabilityRows, expensesByCategory, expensesByVehicle,
  expenseTrend, fuelAnalytics, revenueOverTime, revenueByClient, revenueByVehicle,
  revenueByRoute, revenueByOrder,
  type DateRange, type ReportDataset, type Series,
} from "@/lib/reports-data";

export const Route = createFileRoute("/_protected/dashboard/reports/$section")({
  component: ReportsSection,
  head: ({ params }) => {
    const label = REPORT_SECTIONS.find((s) => s.key === params.section)?.label ?? "Reports";
    const title = `${label} analytics · LoadLink`;
    return {
      meta: [
        { title },
        { name: "description", content: `Drill into ${label.toLowerCase()} analytics for your LoadLink operation.` },
        { property: "og:title", content: title },
        { property: "og:description", content: `Drill into ${label.toLowerCase()} analytics for your LoadLink operation.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
});

type BodyProps = { d: ReportDataset; range: DateRange; role: string };

function ReportsSection() {
  const { section } = Route.useParams() as { section: string };
  const { role } = useAuth();
  const allowed = (ROLE_SECTIONS[role] ?? []) as SectionKey[];
  const meta = REPORT_SECTIONS.find((s) => s.key === section);

  if (!meta || !ALL_SECTIONS.includes(section as SectionKey)) throw notFound();
  if (!allowed.includes(section as SectionKey)) {
    return (
      <DashboardShell title={meta.label} role="Reports">
        <div className="card-elevated p-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-secondary grid place-items-center mb-3">
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="font-display font-semibold">This report is not available for your role.</div>
          <p className="text-sm text-muted-foreground mt-1">
            Ask your company administrator if you believe you should have access.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return <SectionFrame section={section as SectionKey} label={meta.label} allowed={allowed} />;
}

function SectionFrame({ section, label, allowed }: { section: SectionKey; label: string; allowed: SectionKey[] }) {
  const { dataset, scoped, loading, filters, setFilters, resetFilters, range } = useReportsScope();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { role } = useAuth();

  return (
    <DashboardShell title={label} role={`Reports · ${range.label}`}>
      <div className="space-y-3">
        <SectionTabs current={section} allowed={allowed} />
        <FilterBar filters={filters} dataset={dataset} onOpen={() => setSheetOpen(true)} />
        <FilterSheet
          open={sheetOpen} onClose={() => setSheetOpen(false)}
          filters={filters} dataset={dataset} onApply={setFilters} onReset={resetFilters}
        />
        {loading ? (
          <SkeletonGrid rows={5} />
        ) : (
          <SectionBody section={section} d={scoped} range={range} role={role} />
        )}
      </div>
    </DashboardShell>
  );
}

/* ------------------------------------------------------------------ */
/* Section bodies                                                      */
/* ------------------------------------------------------------------ */

function SectionBody({ section, d, range, role }: BodyProps & { section: SectionKey }) {
  switch (section) {
    case "revenue": return <RevenueSection d={d} range={range} role={role} />;
    case "orders": return <OrdersSection d={d} range={range} role={role} />;
    case "fleet": return <FleetSection d={d} range={range} role={role} />;
    case "drivers": return <DriversSection d={d} range={range} role={role} />;
    case "clients": return <ClientsSection d={d} range={range} role={role} />;
    case "expenses": return <ExpensesSection d={d} range={range} role={role} />;
    case "profitability": return <ProfitSection d={d} range={range} role={role} />;
    case "fuel": return <FuelSection d={d} range={range} role={role} />;
    case "delivery": return <DeliverySection d={d} range={range} role={role} />;
    default: return null;
  }
}

const staffRoles = (role: string) => role === "admin" || role === "fleet" || role === "dispatcher";

function RevenueSection({ d, range, role }: BodyProps) {
  const k = useMemo(() => overviewKpis(d), [d]);
  const overTime = useMemo(() => revenueOverTime(d, range), [d, range]);
  const byClient = useMemo(() => revenueByClient(d), [d]);
  const byVehicle = useMemo(() => revenueByVehicle(d), [d]);
  const byRoute = useMemo(() => revenueByRoute(d), [d]);
  const byOrder = useMemo(() => revenueByOrder(d), [d]);

  if (!d.orders.length && !d.payments.length) return <EmptyForPeriod what="revenue" />;

  const kpiRows = [
    { label: "Total revenue", m: k.revenue, format: fmtKSh },
    { label: "Collected", m: k.paidRevenue, format: fmtKSh },
    { label: "Outstanding", m: k.outstanding, format: fmtKSh },
    { label: "Avg order value", m: k.avgOrderValue, format: fmtKSh },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTileM label="Total revenue" m={k.revenue} format={fmtKSh} />
        <MetricTileM label="Collected" m={k.paidRevenue} format={fmtKSh} />
        <MetricTileM label="Outstanding" m={k.outstanding} format={fmtKSh} />
        <MetricTileM label="Avg order value" m={k.avgOrderValue} format={fmtKSh} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Revenue report — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [csvKpis(kpiRows), csvSeries("Revenue over time", overTime), csvSeries("Revenue by client", byClient), csvSeries("Revenue by route", byRoute)]}
          getPdf={() => ({
            kpis: pdfKpis(kpiRows),
            tables: [csvSeries("Revenue over time", overTime), csvSeries("Revenue by client", byClient), csvSeries("Revenue by vehicle", byVehicle), csvSeries("Revenue by route", byRoute), csvSeries("Top orders", byOrder)],
          })}
        />
      </div>

      <ChartCard title="Revenue over time" series={overTime} kind="trend" format={fmtKSh}
        badge={k.revenue.quality !== "actual" ? k.revenue.quality : undefined} />
      <ChartCard title="Revenue by client" series={byClient.slice(0, 10)} format={fmtKSh} />
      <SectionCard title="Top clients">
        <RankRows series={byClient.slice(0, 10)} format={fmtKSh} suffix="revenue"
          linkFor={(s) => (s.id && (role === "admin" || role === "fleet") ? `/dashboard/fleet/clients/${s.id}` : null)} />
      </SectionCard>
      <ChartCard title="Revenue by vehicle" series={byVehicle.slice(0, 10)} format={fmtKSh} />
      <ChartCard title="Revenue by route" series={byRoute.slice(0, 10)} format={fmtKSh} />
      <SectionCard title="Top orders by revenue">
        <RankRows series={byOrder.slice(0, 10)} format={fmtFull}
          linkFor={(s) => (s.id ? `/dashboard/orders/${s.id}` : null)} />
      </SectionCard>
      {k.revenue.quality === "estimated" && (
        <DataNote>
          Orders without a final invoice total are valued at the quoted amount and marked Estimated. They become
          actual once invoiced.
        </DataNote>
      )}
    </div>
  );
}

function OrdersSection({ d, range }: BodyProps) {
  const a = useMemo(() => orderAnalytics(d), [d]);
  const byOrder = useMemo(() => revenueByOrder(d), [d]);
  if (!d.orders.length) return <EmptyForPeriod what="orders" />;

  const statusSeries: Series = a.byStatus.map(({ status, count }) => ({
    label: status.replace(/_/g, " "), value: count,
  }));
  const kpiRows = [
    { label: "Total orders", m: { value: a.total, quality: "actual" as const }, format: fmtNum },
    { label: "Completed", m: { value: a.completed, quality: "actual" as const }, format: fmtNum },
    { label: "Completion rate", m: { value: a.completionRate, quality: "actual" as const }, format: fmtPct },
    { label: "Cancellation rate", m: { value: a.cancellationRate, quality: "actual" as const }, format: fmtPct },
    { label: "Delay rate", m: { value: a.delayRate, quality: "actual" as const }, format: fmtPct },
    { label: "Avg order value", m: { value: a.avgOrderValue, quality: "actual" as const }, format: fmtKSh },
    {
      label: "Avg delivery time",
      m: { value: a.avgDeliveryMinutes ?? 0, quality: (a.avgDeliveryMinutes != null ? "actual" : "unavailable") as "actual" | "unavailable" },
      format: fmtMin,
    },
    {
      label: "Avg distance",
      m: { value: a.avgDistanceKm ?? 0, quality: (a.avgDistanceKm != null ? "actual" : "unavailable") as "actual" | "unavailable" },
      format: fmtKm,
    },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTile label="Total orders" value={fmtNum(a.total)} />
        <MetricTile label="Completed" value={fmtNum(a.completed)} />
        <MetricTile label="Pending" value={fmtNum(a.pending)} />
        <MetricTile label="In transit" value={fmtNum(a.inTransit)} />
        <MetricTile label="Delayed" value={fmtNum(a.delayed)} />
        <MetricTile label="Cancelled" value={fmtNum(a.cancelled)} />
        <MetricTile label="Completion rate" value={fmtPct(a.completionRate)} />
        <MetricTile label="Cancellation rate" value={fmtPct(a.cancellationRate)} />
        <MetricTile label="Delay rate" value={fmtPct(a.delayRate)} />
        <MetricTile label="Avg delivery time" value={fmtMin(a.avgDeliveryMinutes)} />
        <MetricTile label="Avg distance" value={a.avgDistanceKm != null ? fmtKm(a.avgDistanceKm) : "—"} />
        <MetricTile label="Avg order value" value={fmtKSh(a.avgOrderValue)} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Order analytics — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [csvKpis(kpiRows), csvSeries("Orders by status", statusSeries, "Orders"), csvSeries("Top orders by value", byOrder)]}
          getPdf={() => ({ kpis: pdfKpis(kpiRows), tables: [csvSeries("Orders by status", statusSeries, "Orders"), csvSeries("Top orders by value", byOrder)] })}
        />
      </div>

      <ChartCard title="Orders by status" series={statusSeries} format={fmtNum} />
      <SectionCard title="Orders by value">
        <RankRows series={byOrder.slice(0, 10)} format={fmtFull}
          linkFor={(s) => (s.id ? `/dashboard/orders/${s.id}` : null)} />
      </SectionCard>
    </div>
  );
}

function FleetSection({ d, range, role }: BodyProps) {
  const rows = useMemo(() => vehicleReport(d), [d]);
  const summary = useMemo(() => fleetSummary(d, rows), [d, rows]);
  const byRevenue: Series = rows.map((r) => ({ id: r.id, label: r.plate, sub: r.model ?? undefined, value: r.revenue }));
  if (!rows.length) return <EmptyForPeriod what="fleet activity" />;

  const kpiRows = [
    { label: "Vehicles", m: { value: summary.total, quality: "actual" as const }, format: fmtNum },
    { label: "Active", m: { value: summary.active, quality: "actual" as const }, format: fmtNum },
    { label: "Idle", m: { value: summary.idle, quality: "actual" as const }, format: fmtNum },
    { label: "In maintenance", m: { value: summary.maintenance, quality: "actual" as const }, format: fmtNum },
    { label: "Utilisation", m: { value: summary.utilization, quality: "actual" as const }, format: fmtPct },
    { label: "Distance covered", m: { value: summary.distanceKm, quality: "actual" as const }, format: fmtKm },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTile label="Vehicles" value={fmtNum(summary.total)} />
        <MetricTile label="Active" value={fmtNum(summary.active)} />
        <MetricTile label="Idle" value={fmtNum(summary.idle)} />
        <MetricTile label="In maintenance" value={fmtNum(summary.maintenance)} />
        <MetricTile label="Utilisation" value={fmtPct(summary.utilization)} />
        <MetricTile label="Distance covered" value={fmtKm(summary.distanceKm)} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Fleet analytics — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [
            csvKpis(kpiRows),
            { title: "Vehicle performance", headers: ["Plate", "Model", "Status", "Trips", "Distance (km)", "Revenue (KSh)", "Expenses (KSh)", "Profit (KSh)"],
              rows: rows.map((r) => [r.plate, r.model, r.status, r.trips, r.distanceKm, r.revenue, r.expenses, r.profit]) },
          ]}
          getPdf={() => ({
            kpis: pdfKpis(kpiRows),
            tables: [{ title: "Vehicle performance", headers: ["Plate", "Trips", "Distance (km)", "Revenue (KSh)", "Profit (KSh)"],
              rows: rows.map((r) => [r.plate, r.trips, r.distanceKm, r.revenue, r.profit]) }],
          })}
        />
      </div>

      <ChartCard title="Revenue by vehicle" series={byRevenue} format={fmtKSh} />
      <SectionCard title="Vehicle performance">
        <RankRows
          series={rows.slice(0, 12).map((r) => ({
            id: r.id, label: r.plate, value: r.profit,
            sub: `${r.trips} trips · ${fmtKm(r.distanceKm)} · revenue ${fmtKSh(r.revenue)} · ${fmtPct(r.utilization)} completed`,
          }))}
          format={fmtFull} suffix="profit"
          linkFor={(s) => (s.id && staffRoles(role) ? `/dashboard/fleet/vehicles/${s.id}` : null)}
        />
      </SectionCard>
      <DataNote>
        Utilisation compares completed trips with a vehicle's assigned orders in the period. Expenses are finance
        records linked to each vehicle; vehicles without expense entries show their full revenue as profit.
      </DataNote>
    </div>
  );
}

function DriversSection({ d, range, role }: BodyProps) {
  const rows = useMemo(() => driverReport(d), [d]);
  if (!rows.length) return <EmptyForPeriod what="driver activity" />;

  const totalTrips = rows.reduce((a, r) => a + r.trips, 0);
  const completed = rows.reduce((a, r) => a + r.completed, 0);
  const onTimeValues = rows.map((r) => r.onTimeRate).filter((x): x is number => x != null);
  const avgOnTime = onTimeValues.length ? Math.round(onTimeValues.reduce((a, n) => a + n, 0) / onTimeValues.length) : null;
  const byRevenue: Series = rows.map((r) => ({ id: r.id, label: r.name, value: r.revenue }));
  const staff = staffRoles(role);

  const kpiRows = [
    { label: "Drivers", m: { value: rows.length, quality: "actual" as const }, format: fmtNum },
    { label: "Trips", m: { value: totalTrips, quality: "actual" as const }, format: fmtNum },
    { label: "Completed deliveries", m: { value: completed, quality: "actual" as const }, format: fmtNum },
    { label: "Avg on-time rate", m: { value: avgOnTime ?? 0, quality: (avgOnTime != null ? "actual" : "unavailable") as "actual" | "unavailable" }, format: fmtPct },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTile label="Drivers" value={fmtNum(rows.length)} />
        <MetricTile label="Trips" value={fmtNum(totalTrips)} />
        <MetricTile label="Completed deliveries" value={fmtNum(completed)} />
        <MetricTile label="Avg on-time rate" value={avgOnTime != null ? fmtPct(avgOnTime) : "—"} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Driver analytics — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [
            csvKpis(kpiRows),
            { title: "Driver performance", headers: ["Driver", "Status", "Vehicle", "Trips", "Completed", "Distance (km)", "On-time (%)", "Avg trip (min)", "Revenue (KSh)"],
              rows: rows.map((r) => [r.name, r.status, r.vehicle, r.trips, r.completed, r.distanceKm, r.onTimeRate, r.avgTripMinutes, r.revenue]) },
          ]}
          getPdf={() => ({
            kpis: pdfKpis(kpiRows),
            tables: [{ title: "Driver leaderboard", headers: ["Driver", "Trips", "Completed", "Distance (km)", "Revenue (KSh)"],
              rows: rows.map((r) => [r.name, r.trips, r.completed, r.distanceKm, r.revenue]) }],
          })}
        />
      </div>

      <SectionCard title={staff ? "Driver leaderboard" : "My performance"}>
        <RankRows
          series={rows.slice(0, 12).map((r) => ({
            id: r.id, label: r.name, value: r.revenue,
            sub: `${r.completed}/${r.trips} delivered · ${fmtKm(r.distanceKm)}${r.onTimeRate != null ? ` · on-time ${fmtPct(r.onTimeRate)}` : ""}${r.vehicle ? ` · ${r.vehicle}` : ""}`,
          }))}
          format={fmtFull} suffix="revenue"
          linkFor={(s) => (s.id && staff ? `/dashboard/fleet/drivers/${s.id}` : null)}
        />
      </SectionCard>
      {!staff && (
        <DataNote>
          You are viewing your own trips only. On-time rate comes from completed trips against their planned
          drop-off window.
        </DataNote>
      )}
      {avgOnTime == null && staff && (
        <DataNote>
          No on-time data yet: it is calculated once drivers complete trips with a recorded drop-off time.
        </DataNote>
      )}
    </div>
  );
}

function ClientsSection({ d, range, role }: BodyProps) {
  const rows = useMemo(() => clientReport(d), [d]);
  if (!rows.length) return <EmptyForPeriod what="client activity" />;

  const revenue = rows.reduce((a, r) => a + r.revenue, 0);
  const outstanding = rows.reduce((a, r) => a + r.outstanding, 0);
  const orders = rows.reduce((a, r) => a + r.orders, 0);
  const canOpenProfile = role === "admin" || role === "fleet";

  const kpiRows = [
    { label: "Clients", m: { value: rows.length, quality: "actual" as const }, format: fmtNum },
    { label: "Revenue", m: { value: revenue, quality: "actual" as const }, format: fmtKSh },
    { label: "Avg order value", m: { value: orders ? Math.round(revenue / orders) : 0, quality: "actual" as const }, format: fmtKSh },
    { label: "Outstanding balance", m: { value: outstanding, quality: "actual" as const }, format: fmtKSh },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTile label="Clients" value={fmtNum(rows.length)} />
        <MetricTile label="Revenue" value={fmtKSh(revenue)} />
        <MetricTile label="Avg order value" value={orders ? fmtKSh(revenue / orders) : "—"} />
        <MetricTile label="Outstanding balance" value={fmtKSh(outstanding)} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Client analytics — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [
            csvKpis(kpiRows),
            { title: "Clients", headers: ["Client", "Orders", "Completed", "Cancelled", "Revenue (KSh)", "Avg order (KSh)", "Outstanding (KSh)", "Cancellation (%)"],
              rows: rows.map((r) => [r.name, r.orders, r.completed, r.cancelled, r.revenue, r.avgOrderValue, r.outstanding, r.cancellationRate]) },
          ]}
          getPdf={() => ({
            kpis: pdfKpis(kpiRows),
            tables: [{ title: "Clients", headers: ["Client", "Orders", "Revenue (KSh)", "Outstanding (KSh)"],
              rows: rows.map((r) => [r.name, r.orders, r.revenue, r.outstanding]) }],
          })}
        />
      </div>

      <SectionCard title="Clients by revenue">
        <RankRows
          series={rows.slice(0, 12).map((r) => ({
            id: r.id, label: r.name, value: r.revenue,
            sub: `${r.orders} orders · avg ${fmtKSh(r.avgOrderValue)}${r.outstanding > 0 ? ` · outstanding ${fmtKSh(r.outstanding)}` : ""}${r.cancellationRate > 0 ? ` · ${fmtPct(r.cancellationRate)} cancelled` : ""}`,
          }))}
          format={fmtFull}
          linkFor={(s) => (s.id && canOpenProfile ? `/dashboard/fleet/clients/${s.id}` : null)}
        />
      </SectionCard>
      {outstanding > 0 && (
        <DataNote>
          Outstanding balances come from issued invoices that are not yet fully paid. Open a client profile to
          manage collections.
        </DataNote>
      )}
    </div>
  );
}

function ExpensesSection({ d, range }: BodyProps) {
  const byCategory = useMemo(() => expensesByCategory(d), [d]);
  const byVehicle = useMemo(() => expensesByVehicle(d), [d]);
  const trend = useMemo(() => expenseTrend(d), [d]);
  if (!d.expenses.length) return <EmptyForPeriod what="expenses" />;

  const total = byCategory.reduce((a, s) => a + s.value, 0);
  const kpiRows = [
    { label: "Total expenses", m: { value: total, quality: "actual" as const }, format: fmtKSh },
    { label: "Categories used", m: { value: byCategory.length, quality: "actual" as const }, format: fmtNum },
    { label: "Vehicles with costs", m: { value: byVehicle.length, quality: "actual" as const }, format: fmtNum },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTile label="Total expenses" value={fmtKSh(total)} />
        <MetricTile label="Biggest category" value={byCategory[0] ? `${byCategory[0].label} · ${fmtKSh(byCategory[0].value)}` : "—"} />
        <MetricTile label="Categories used" value={fmtNum(byCategory.length)} />
        <MetricTile label="Vehicles with costs" value={fmtNum(byVehicle.length)} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Expense analytics — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [csvKpis(kpiRows), csvSeries("By category", byCategory), csvSeries("By vehicle", byVehicle), csvSeries("Trend", trend)]}
          getPdf={() => ({ kpis: pdfKpis(kpiRows), tables: [csvSeries("By category", byCategory), csvSeries("By vehicle", byVehicle), csvSeries("Trend", trend)] })}
        />
      </div>

      <ChartCard title="Expenses by category" series={byCategory} format={fmtKSh} />
      <ChartCard title="Expenses by vehicle" series={byVehicle.slice(0, 10)} format={fmtKSh} />
      <ChartCard title="Expense trend" series={trend} kind="trend" format={fmtKSh} />
    </div>
  );
}

function ProfitSection({ d, range }: BodyProps) {
  const k = useMemo(() => overviewKpis(d), [d]);
  const rows = useMemo(() => profitabilityRows(d), [d]);
  if (!rows.length) return <EmptyForPeriod what="profitability" />;

  const loss = rows.filter((r) => r.profit < 0).length;
  const unlinked = rows.filter((r) => !r.hasExpenses).length;
  const kpiRows = [
    { label: "Revenue", m: k.revenue, format: fmtKSh },
    { label: "Linked expenses", m: k.expenses, format: fmtKSh },
    { label: "Gross profit", m: k.profit, format: fmtKSh },
    { label: "Margin", m: k.margin, format: fmtPct },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTileM label="Revenue" m={k.revenue} format={fmtKSh} />
        <MetricTileM label="Linked expenses" m={k.expenses} format={fmtKSh} />
        <MetricTileM label="Gross profit" m={k.profit} format={fmtKSh} />
        <MetricTileM label="Margin" m={k.margin} format={fmtPct} />
        <MetricTile label="Loss-making orders" value={fmtNum(loss)} />
        <MetricTile label="Orders without expenses" value={fmtNum(unlinked)} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Profitability — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [
            csvKpis(kpiRows),
            { title: "Profit per order", headers: ["Order", "Client", "Revenue (KSh)", "Expenses (KSh)", "Profit (KSh)", "Margin (%)"],
              rows: rows.map((r) => [r.orderNumber, r.client, r.revenue.value, r.expenses, r.profit, r.margin]) },
          ]}
          getPdf={() => ({
            kpis: pdfKpis(kpiRows),
            tables: [{ title: "Profit per order", headers: ["Order", "Client", "Revenue (KSh)", "Profit (KSh)", "Margin (%)"],
              rows: rows.slice(0, 25).map((r) => [r.orderNumber, r.client, r.revenue.value, r.profit, r.margin]) }],
            notes: ["Profit compares revenue with expense records linked to each order. Orders without linked expenses show full revenue as profit."],
          })}
        />
      </div>

      <SectionCard title="Profit by order">
        <RankRows
          series={rows.slice(0, 12).map((r) => ({
            id: r.id, label: r.orderNumber, value: r.profit,
            sub: `${r.client} · revenue ${fmtKSh(r.revenue.value)} · expenses ${fmtKSh(r.expenses)} · margin ${fmtPct(r.margin)}${r.hasExpenses ? "" : " · no expenses linked"}`,
          }))}
          format={fmtFull}
          linkFor={(s) => (s.id ? `/dashboard/orders/${s.id}` : null)}
        />
      </SectionCard>
      <DataNote>
        Gross profit is revenue minus fuel, driver allowances, maintenance, tolls and other expense records linked
        to each order. Revenue on orders not yet invoiced is estimated from the quoted total, so the margin is
        estimated too.
      </DataNote>
    </div>
  );
}

function FuelSection({ d, range }: BodyProps) {
  const f = useMemo(() => fuelAnalytics(d), [d]);
  if (!f.hasLogs && f.fuelExpenseTotal === 0) return <EmptyForPeriod what="fuel records" />;

  const costPerKm = f.costPerKm != null ? f.costPerKm : null;
  const kmPerLitre = f.kmPerLitre != null ? f.kmPerLitre : null;
  const kpiRows = [
    { label: "Fuel cost (logs)", m: { value: f.totalCost, quality: (f.hasLogs ? "actual" : "unavailable") as "actual" | "unavailable" }, format: fmtKSh },
    { label: "Litres purchased", m: { value: f.litres, quality: (f.hasLogs ? "actual" : "unavailable") as "actual" | "unavailable" }, format: fmtNum },
    { label: "Cost per km", m: { value: f.costPerKm ?? 0, quality: (costPerKm != null ? "estimated" : "unavailable") as "estimated" | "unavailable" }, format: (n: number) => `KSh ${n.toFixed(2)}` },
    { label: "Efficiency (km/L)", m: { value: f.kmPerLitre ?? 0, quality: (kmPerLitre != null ? "estimated" : "unavailable") as "estimated" | "unavailable" }, format: (n: number) => n.toFixed(1) },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTileM label="Fuel cost (logs)" m={{ value: f.totalCost, quality: f.hasLogs ? "actual" : "unavailable" }} format={fmtKSh} />
        <MetricTileM label="Litres purchased" m={{ value: f.litres, quality: f.hasLogs ? "actual" : "unavailable" }} format={fmtNum} />
        <MetricTileM label="Fuel expense category" m={{ value: f.fuelExpenseTotal, quality: f.fuelExpenseTotal ? "actual" : "unavailable" }} format={fmtKSh} />
        <MetricTileM label="Cost per km" m={{ value: f.costPerKm ?? 0, quality: costPerKm != null ? "estimated" : "unavailable" }} format={(n) => `KSh ${n.toFixed(2)}`} />
        <MetricTileM label="Efficiency (km/L)" m={{ value: f.kmPerLitre ?? 0, quality: kmPerLitre != null ? "estimated" : "unavailable" }} format={(n) => n.toFixed(1)} />
        <MetricTile label="Distance covered" value={fmtKm(f.distanceKm)} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Fuel analytics — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [
            csvKpis(kpiRows),
            { title: "Fuel by vehicle", headers: ["Vehicle", "Cost (KSh)", "Litres", "Cost per km (KSh)"],
              rows: f.byVehicle.map((v) => [v.label, v.cost, v.litres, v.costPerKm]) },
            csvSeries("Fuel cost trend", f.trend),
          ]}
          getPdf={() => ({
            kpis: pdfKpis(kpiRows),
            tables: [csvSeries("Fuel cost trend", f.trend),
              { title: "Fuel by vehicle", headers: ["Vehicle", "Cost (KSh)", "Litres"], rows: f.byVehicle.map((v) => [v.label, v.cost, v.litres]) }],
            notes: ["Fuel figures come from manually recorded fuel logs and fuel expenses. There is no vehicle fuel telemetry."],
          })}
        />
      </div>

      <ChartCard title="Fuel cost trend" series={f.trend} kind="trend" format={fmtKSh} />
      <SectionCard title="Fuel cost by vehicle">
        <RankRows
          series={f.byVehicle.slice(0, 12).map((v) => ({
            id: v.id, label: v.label, value: v.cost,
            sub: `${fmtNum(v.litres)} L${v.costPerKm != null ? ` · KSh ${v.costPerKm.toFixed(2)}/km` : " · no distance recorded"}`,
          }))}
          format={fmtFull}
        />
      </SectionCard>
      <DataNote>
        Fuel figures come from manually recorded fuel logs and fuel expense entries — there is no fuel telemetry in
        the system. Cost per km and efficiency are derived from recorded litres against distance and are labelled
        Estimated.
      </DataNote>
    </div>
  );
}

function DeliverySection({ d, range }: BodyProps) {
  const p = useMemo(() => deliveryPerformance(d), [d]);
  const a = useMemo(() => orderAnalytics(d), [d]);
  if (!d.orders.length) return <EmptyForPeriod what="deliveries" />;

  const kpiRows = [
    { label: "On-time rate", m: { value: p.onTimeRate ?? 0, quality: (p.onTimeRate != null ? "actual" : "unavailable") as "actual" | "unavailable" }, format: fmtPct },
    { label: "Completion rate", m: { value: p.completionRate, quality: "actual" as const }, format: fmtPct },
    {
      label: "Avg delivery duration",
      m: { value: p.avgDurationMinutes ?? 0, quality: (p.avgDurationMinutes != null ? "actual" : "unavailable") as "actual" | "unavailable" },
      format: fmtMin,
    },
    {
      label: "Avg distance",
      m: { value: p.avgDistanceKm ?? 0, quality: (p.avgDistanceKm != null ? "actual" : "unavailable") as "actual" | "unavailable" },
      format: fmtKm,
    },
  ];

  return (
    <div className="space-y-3">
      <KpiGrid>
        <MetricTile label="On-time rate" value={p.onTimeRate != null ? fmtPct(p.onTimeRate) : "—"} hint={p.measurable ? `${fmtNum(p.measurable)} measurable deliveries` : "No measurable deliveries"} />
        <MetricTile label="Late deliveries" value={fmtNum(p.late)} />
        <MetricTile label="Completion rate" value={fmtPct(p.completionRate)} />
        <MetricTile label="Delayed right now" value={fmtNum(p.delayedNow)} />
        <MetricTile label="Avg delivery duration" value={fmtMin(p.avgDurationMinutes)} />
        <MetricTile label="Avg distance" value={p.avgDistanceKm != null ? fmtKm(p.avgDistanceKm) : "—"} />
      </KpiGrid>

      <div className="flex items-center justify-end">
        <ExportButtons
          name={`Delivery performance — ${range.label}`}
          periodLabel={range.label}
          getCsv={() => [csvKpis(kpiRows), csvSeries("Orders by status", a.byStatus.map(({ status, count }) => ({ label: status.replace(/_/g, " "), value: count })), "Orders")]}
          getPdf={() => ({
            kpis: pdfKpis(kpiRows),
            tables: [csvSeries("Orders by status", a.byStatus.map(({ status, count }) => ({ label: status.replace(/_/g, " "), value: count })), "Orders")],
          })}
        />
      </div>

      {p.measurable === 0 ? (
        <DataNote>
          No completed deliveries in this period have a planned drop-off time recorded, so on-time performance cannot
          be measured yet. It appears here once orders are delivered with their pickup and drop-off times captured.
        </DataNote>
      ) : (
        <DataNote>
          A delivery counts as on time when it completed within 110% of the planned drop-off window recorded on the
          order. Orders delayed in transit are shown separately.
        </DataNote>
      )}
    </div>
  );
}
