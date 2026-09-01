/**
 * Reports & Business Intelligence — pure derivation layer.
 *
 * This module owns NO data. Every figure below is derived from records that
 * already exist in the Orders, Fleet, Driver, Client CRM, Finance and Tracking
 * modules. Nothing here writes, and nothing here invents a value: where the
 * source data is missing a metric is reported as `unavailable` rather than
 * estimated, and where a value is inferred it is tagged `estimated`.
 */
import type { OrderRow, OrderStatus } from "@/lib/orders-data";
import type { VehicleRow, VehicleStatus } from "@/lib/fleet-data";
import type { DriverRow } from "@/lib/driver-data-model";
import type { ClientRow } from "@/lib/crm-data";
import type { ExpenseRow, ExpenseCategory, InvoiceRow, PaymentRow } from "@/lib/finance-data";
import { outstanding } from "@/lib/finance-data";

/* ------------------------------------------------------------------ */
/* Data quality                                                        */
/* ------------------------------------------------------------------ */

export type Quality = "actual" | "estimated" | "unavailable";

export const QUALITY_META: Record<Quality, { label: string; chip: string; note: string }> = {
  actual: { label: "Actual", chip: "status-success", note: "Recorded in the system" },
  estimated: { label: "Estimated", chip: "status-warning", note: "Derived from quoted or partial data" },
  unavailable: { label: "Unavailable", chip: "bg-secondary text-muted-foreground", note: "No source data captured yet" },
};

export type Metric = { value: number; quality: Quality };

export const metric = (value: number, quality: Quality = "actual"): Metric => ({ value, quality });

/* ------------------------------------------------------------------ */
/* Periods                                                             */
/* ------------------------------------------------------------------ */

export type PeriodKey = "today" | "week" | "month" | "last_month" | "year" | "custom" | "all";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

export type DateRange = { start: number; end: number; label: string };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

export function periodRange(key: PeriodKey, from?: string | null, to?: string | null): DateRange {
  const now = new Date();
  switch (key) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now), label: "Today" };
    case "week": {
      const day = (now.getDay() + 6) % 7; // Monday-first
      const s = new Date(now);
      s.setDate(now.getDate() - day);
      return { start: startOfDay(s), end: endOfDay(now), label: "This week" };
    }
    case "month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        end: endOfDay(now),
        label: now.toLocaleString(undefined, { month: "long", year: "numeric" }),
      };
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: s.getTime(), end: e.getTime(), label: s.toLocaleString(undefined, { month: "long", year: "numeric" }) };
    }
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1).getTime(), end: endOfDay(now), label: String(now.getFullYear()) };
    case "custom": {
      const s = from ? startOfDay(new Date(from)) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const e = to ? endOfDay(new Date(to)) : endOfDay(now);
      return { start: s, end: e, label: `${new Date(s).toLocaleDateString()} – ${new Date(e).toLocaleDateString()}` };
    }
    default:
      return { start: 0, end: endOfDay(now), label: "All time" };
  }
}

export const inRange = (iso: string | null | undefined, r: DateRange): boolean => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= r.start && t <= r.end;
};

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export type ReportFilters = {
  period: PeriodKey;
  from: string | null;
  to: string | null;
  vehicleId: string | null;
  driverId: string | null;
  clientId: string | null;
  status: OrderStatus | "all";
  branch: string | null;
  vehicleType: string | null;
};

export const DEFAULT_FILTERS: ReportFilters = {
  period: "month",
  from: null,
  to: null,
  vehicleId: null,
  driverId: null,
  clientId: null,
  status: "all",
  branch: null,
  vehicleType: null,
};

export function activeFilterCount(f: ReportFilters): number {
  return [f.vehicleId, f.driverId, f.clientId, f.branch, f.vehicleType].filter(Boolean).length +
    (f.status !== "all" ? 1 : 0);
}

/* ------------------------------------------------------------------ */
/* Dataset                                                             */
/* ------------------------------------------------------------------ */

export type FuelLogRow = {
  id: string;
  truck_id: string;
  litres: number;
  cost: number;
  odometer_km: number | null;
  station: string | null;
  filled_at: string;
  created_at: string;
};

export type ReportDataset = {
  orders: OrderRow[];
  vehicles: VehicleRow[];
  drivers: DriverRow[];
  clients: ClientRow[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  expenses: ExpenseRow[];
  fuel: FuelLogRow[];
};

export const EMPTY_DATASET: ReportDataset = {
  orders: [], vehicles: [], drivers: [], clients: [], invoices: [], payments: [], expenses: [], fuel: [],
};

/* ------------------------------------------------------------------ */
/* Scoping helpers                                                     */
/* ------------------------------------------------------------------ */

const COMPLETED: OrderStatus[] = ["delivered", "completed"];
const ACTIVE: OrderStatus[] = [
  "confirmed", "assigned", "en_route_pickup", "arrived_pickup", "loading",
  "in_transit", "delayed", "arrived_dropoff",
];

export const isCompleted = (o: OrderRow) => COMPLETED.includes(o.status);
export const isActive = (o: OrderRow) => ACTIVE.includes(o.status);

/** Revenue booked on an order — actual when invoiced/settled, estimated when only quoted. */
export function orderRevenue(o: OrderRow): Metric {
  if (o.final_total != null && Number(o.final_total) > 0) return metric(Number(o.final_total), "actual");
  if (Number(o.estimated_total) > 0) return metric(Number(o.estimated_total), "estimated");
  return metric(0, "unavailable");
}

export function matchesFilters(o: OrderRow, f: ReportFilters, r: DateRange, vehicles: VehicleRow[]): boolean {
  if (!inRange(o.created_at, r)) return false;
  if (f.vehicleId && o.truck_id !== f.vehicleId) return false;
  if (f.driverId && o.driver_id !== f.driverId) return false;
  if (f.clientId && o.crm_client_id !== f.clientId && o.client_id !== f.clientId) return false;
  if (f.status !== "all" && o.status !== f.status) return false;
  if (f.branch || f.vehicleType) {
    const v = vehicles.find((x) => x.id === o.truck_id);
    if (f.branch && v?.branch !== f.branch) return false;
    if (f.vehicleType && v?.vehicle_type !== f.vehicleType) return false;
  }
  return true;
}

export function scopeDataset(ds: ReportDataset, f: ReportFilters, r: DateRange) {
  const orders = ds.orders.filter((o) => matchesFilters(o, f, r, ds.vehicles));
  const orderIds = new Set(orders.map((o) => o.id));

  const expenses = ds.expenses.filter((e) => {
    if (!inRange(e.expense_date, r)) return false;
    if (f.vehicleId && e.truck_id !== f.vehicleId) return false;
    if (f.driverId && e.driver_id !== f.driverId) return false;
    if (f.clientId && !(e.order_id && orderIds.has(e.order_id))) return false;
    return true;
  });

  const invoices = ds.invoices.filter((i) => {
    if (!inRange(i.issue_date, r)) return false;
    if (f.clientId && i.client_id !== f.clientId) return false;
    if (f.vehicleId || f.driverId) return !!i.order_id && orderIds.has(i.order_id);
    return true;
  });
  const invoiceIds = new Set(invoices.map((i) => i.id));

  const payments = ds.payments.filter((p) => {
    if (!inRange(p.payment_date, r)) return false;
    if (f.clientId && p.client_id !== f.clientId) return false;
    if (f.vehicleId || f.driverId) return !!p.invoice_id && invoiceIds.has(p.invoice_id);
    return true;
  });

  const fuel = ds.fuel.filter((x) => inRange(x.filled_at, r) && (!f.vehicleId || x.truck_id === f.vehicleId));

  const vehicles = ds.vehicles.filter((v) =>
    (!f.vehicleId || v.id === f.vehicleId) &&
    (!f.branch || v.branch === f.branch) &&
    (!f.vehicleType || v.vehicle_type === f.vehicleType));

  const drivers = ds.drivers.filter((d) =>
    (!f.driverId || d.id === f.driverId) && (!f.branch || d.branch === f.branch));

  const clients = ds.clients.filter((c) => !f.clientId || c.id === f.clientId);

  return { orders, vehicles, drivers, clients, invoices, payments, expenses, fuel } as ReportDataset;
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export type OverviewKpis = {
  revenue: Metric;
  paidRevenue: Metric;
  outstanding: Metric;
  orders: number;
  completed: number;
  active: number;
  cancelled: number;
  fleetUtilization: Metric;
  avgOrderValue: Metric;
  expenses: Metric;
  profit: Metric;
  margin: Metric;
  distanceKm: Metric;
};

export function overviewKpis(s: ReportDataset): OverviewKpis {
  const revenues = s.orders.map(orderRevenue);
  const revenueTotal = revenues.reduce((a, m) => a + m.value, 0);
  const anyEstimated = revenues.some((m) => m.quality === "estimated");

  const paid = s.payments.reduce((a, p) => a + Number(p.amount ?? 0), 0);
  const owed = s.invoices
    .filter((i) => i.status !== "cancelled" && i.status !== "draft")
    .reduce((a, i) => a + outstanding(i), 0);

  const completed = s.orders.filter(isCompleted).length;
  const active = s.orders.filter(isActive).length;
  const cancelled = s.orders.filter((o) => o.status === "cancelled").length;

  const busy = s.vehicles.filter((v) =>
    (["assigned", "loading", "on_trip", "offloading"] as VehicleStatus[]).includes(v.status)).length;
  const util = s.vehicles.length ? Math.round((busy / s.vehicles.length) * 100) : 0;

  const expenseTotal = s.expenses.reduce((a, e) => a + Number(e.amount ?? 0), 0);
  const profit = revenueTotal - expenseTotal;

  const distance = s.orders.reduce((a, o) => a + Number(o.distance_km ?? 0), 0);
  const hasDistance = s.orders.some((o) => o.distance_km != null);

  return {
    revenue: metric(Math.round(revenueTotal), s.orders.length ? (anyEstimated ? "estimated" : "actual") : "unavailable"),
    paidRevenue: metric(Math.round(paid), s.payments.length ? "actual" : "unavailable"),
    outstanding: metric(Math.round(owed), s.invoices.length ? "actual" : "unavailable"),
    orders: s.orders.length,
    completed,
    active,
    cancelled,
    fleetUtilization: metric(util, s.vehicles.length ? "actual" : "unavailable"),
    avgOrderValue: metric(s.orders.length ? Math.round(revenueTotal / s.orders.length) : 0,
      s.orders.length ? (anyEstimated ? "estimated" : "actual") : "unavailable"),
    expenses: metric(Math.round(expenseTotal), s.expenses.length ? "actual" : "unavailable"),
    profit: metric(Math.round(profit), s.expenses.length && s.orders.length ? (anyEstimated ? "estimated" : "actual") : "unavailable"),
    margin: metric(revenueTotal ? Math.round((profit / revenueTotal) * 100) : 0,
      revenueTotal && s.expenses.length ? "estimated" : "unavailable"),
    distanceKm: metric(Math.round(distance), hasDistance ? "actual" : "unavailable"),
  };
}

/* ------------------------------------------------------------------ */
/* Series helpers                                                      */
/* ------------------------------------------------------------------ */

export type Series = { label: string; value: number; id?: string | null; sub?: string }[];

export function revenueOverTime(s: ReportDataset, r: DateRange): Series {
  const span = r.end - r.start;
  const byMonth = span > 92 * 86_400_000 || r.start === 0;
  const buckets = new Map<string, number>();

  const push = (iso: string, amount: number) => {
    const d = new Date(iso);
    const key = byMonth
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : d.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + amount);
  };

  for (const o of s.orders) push(o.created_at, orderRevenue(o).value);

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([key, value]) => ({
      label: byMonth
        ? new Date(`${key}-01`).toLocaleString(undefined, { month: "short" })
        : new Date(key).toLocaleString(undefined, { day: "numeric", month: "short" }),
      value: Math.round(value),
    }));
}

export function revenueByClient(s: ReportDataset): Series {
  const map = new Map<string, { label: string; value: number }>();
  for (const o of s.orders) {
    const id = o.crm_client_id ?? o.client_id ?? o.client_name;
    const cur = map.get(id) ?? { label: o.client_name || "Walk-in client", value: 0 };
    cur.value += orderRevenue(o).value;
    map.set(id, cur);
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, label: v.label, value: Math.round(v.value) }))
    .sort((a, b) => b.value - a.value);
}

export function revenueByVehicle(s: ReportDataset): Series {
  const map = new Map<string, number>();
  for (const o of s.orders) {
    if (!o.truck_id) continue;
    map.set(o.truck_id, (map.get(o.truck_id) ?? 0) + orderRevenue(o).value);
  }
  return [...map.entries()]
    .map(([id, value]) => {
      const v = s.vehicles.find((x) => x.id === id);
      return { id, label: v ? `${v.plate}` : "Unknown vehicle", sub: v?.truck_model ?? undefined, value: Math.round(value) };
    })
    .sort((a, b) => b.value - a.value);
}

export function revenueByRoute(s: ReportDataset): Series {
  const short = (a: string) => a.split(",")[0]?.trim() || a;
  const map = new Map<string, number>();
  for (const o of s.orders) {
    const key = `${short(o.pickup_address)} → ${short(o.dropoff_address)}`;
    map.set(key, (map.get(key) ?? 0) + orderRevenue(o).value);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}

export function revenueByOrder(s: ReportDataset): Series {
  return s.orders
    .map((o) => ({ id: o.id, label: o.order_number, sub: o.client_name, value: orderRevenue(o).value }))
    .sort((a, b) => b.value - a.value);
}

/* ------------------------------------------------------------------ */
/* Profitability                                                       */
/* ------------------------------------------------------------------ */

export type OrderProfitRow = {
  id: string;
  orderNumber: string;
  client: string;
  revenue: Metric;
  expenses: number;
  byCategory: { category: ExpenseCategory; amount: number }[];
  profit: number;
  margin: number;
  hasExpenses: boolean;
};

export function profitabilityRows(s: ReportDataset): OrderProfitRow[] {
  return s.orders
    .map((o) => {
      const linked = s.expenses.filter((e) => e.order_id === o.id);
      const byCategory = [...linked.reduce((m, e) => {
        m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amount ?? 0));
        return m;
      }, new Map<ExpenseCategory, number>())].map(([category, amount]) => ({ category, amount }));
      const expenses = byCategory.reduce((a, c) => a + c.amount, 0);
      const rev = orderRevenue(o);
      const profit = Math.round(rev.value - expenses);
      return {
        id: o.id,
        orderNumber: o.order_number,
        client: o.client_name,
        revenue: rev,
        expenses: Math.round(expenses),
        byCategory: byCategory.sort((a, b) => b.amount - a.amount),
        profit,
        margin: rev.value ? Math.round((profit / rev.value) * 100) : 0,
        hasExpenses: linked.length > 0,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

/* ------------------------------------------------------------------ */
/* Fleet                                                               */
/* ------------------------------------------------------------------ */

export type VehicleReportRow = {
  id: string;
  plate: string;
  model: string;
  status: VehicleStatus;
  trips: number;
  distanceKm: number;
  revenue: number;
  expenses: number;
  profit: number;
  utilization: number;
};

export function vehicleReport(s: ReportDataset): VehicleReportRow[] {
  return s.vehicles.map((v) => {
    const orders = s.orders.filter((o) => o.truck_id === v.id);
    const revenue = orders.reduce((a, o) => a + orderRevenue(o).value, 0);
    const expenses = s.expenses.filter((e) => e.truck_id === v.id).reduce((a, e) => a + Number(e.amount ?? 0), 0);
    const distanceKm = orders.reduce((a, o) => a + Number(o.distance_km ?? 0), 0);
    const done = orders.filter(isCompleted).length;
    return {
      id: v.id,
      plate: v.plate,
      model: v.truck_model,
      status: v.status,
      trips: orders.length,
      distanceKm: Math.round(distanceKm),
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
      profit: Math.round(revenue - expenses),
      utilization: orders.length ? Math.round((done / orders.length) * 100) : 0,
    };
  });
}

export type FleetSummary = {
  total: number; active: number; idle: number; maintenance: number;
  utilization: number; distanceKm: number;
};

export function fleetSummary(s: ReportDataset, rows: VehicleReportRow[]): FleetSummary {
  const busy: VehicleStatus[] = ["assigned", "loading", "on_trip", "offloading"];
  const active = s.vehicles.filter((v) => busy.includes(v.status)).length;
  const maintenance = s.vehicles.filter((v) => v.status === "maintenance" || v.status === "out_of_service").length;
  return {
    total: s.vehicles.length,
    active,
    idle: s.vehicles.filter((v) => v.status === "available" || v.status === "idle").length,
    maintenance,
    utilization: s.vehicles.length ? Math.round((active / s.vehicles.length) * 100) : 0,
    distanceKm: rows.reduce((a, v) => a + v.distanceKm, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Drivers                                                             */
/* ------------------------------------------------------------------ */

export type DriverReportRow = {
  id: string;
  name: string;
  status: DriverRow["status"];
  vehicle: string | null;
  trips: number;
  completed: number;
  distanceKm: number;
  onTimeRate: number | null;
  avgTripMinutes: number | null;
  revenue: number;
};

export function driverReport(s: ReportDataset): DriverReportRow[] {
  return s.drivers.map((d) => {
    const orders = s.orders.filter((o) => o.driver_id === d.user_id || o.driver_id === d.id);
    const completed = orders.filter(isCompleted);
    const revenue = orders.reduce((a, o) => a + orderRevenue(o).value, 0);
    const durations = completed
      .map((o) => (o.dropoff_at && o.pickup_at
        ? Math.round((new Date(o.dropoff_at).getTime() - new Date(o.pickup_at).getTime()) / 60000)
        : null))
      .filter((x): x is number => x != null && x > 0);
    const v = s.vehicles.find((x) => x.id === d.assigned_truck_id);
    return {
      id: d.id,
      name: d.full_name,
      status: d.status,
      vehicle: v ? v.plate : null,
      trips: orders.length || d.total_trips,
      completed: completed.length,
      distanceKm: Math.round(orders.reduce((a, o) => a + Number(o.distance_km ?? 0), 0)),
      onTimeRate: d.total_trips ? Math.round((d.on_time_trips / d.total_trips) * 100) : null,
      avgTripMinutes: durations.length ? Math.round(durations.reduce((a, n) => a + n, 0) / durations.length) : null,
      revenue: Math.round(revenue),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export type ClientReportRow = {
  id: string;
  name: string;
  orders: number;
  completed: number;
  cancelled: number;
  revenue: number;
  avgOrderValue: number;
  outstanding: number;
  cancellationRate: number;
  lastActivity: string | null;
};

export function clientReport(s: ReportDataset): ClientReportRow[] {
  const rows = s.clients.map((c) => {
    const orders = s.orders.filter((o) => o.crm_client_id === c.id || o.client_id === c.id);
    const revenue = orders.reduce((a, o) => a + orderRevenue(o).value, 0);
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    return {
      id: c.id,
      name: c.name,
      orders: orders.length,
      completed: orders.filter(isCompleted).length,
      cancelled,
      revenue: Math.round(revenue),
      avgOrderValue: orders.length ? Math.round(revenue / orders.length) : 0,
      outstanding: Math.round(Number(c.outstanding_balance ?? 0)),
      cancellationRate: orders.length ? Math.round((cancelled / orders.length) * 100) : 0,
      lastActivity: c.last_order_at,
    };
  });
  return rows.sort((a, b) => b.revenue - a.revenue);
}

/* ------------------------------------------------------------------ */
/* Orders & delivery performance                                       */
/* ------------------------------------------------------------------ */

export type OrderAnalytics = {
  total: number; completed: number; pending: number; cancelled: number;
  inTransit: number; delayed: number;
  avgDeliveryMinutes: number | null;
  avgDistanceKm: number | null;
  avgOrderValue: number;
  completionRate: number;
  cancellationRate: number;
  delayRate: number;
  byStatus: { status: OrderStatus; count: number }[];
};

export function orderAnalytics(s: ReportDataset): OrderAnalytics {
  const total = s.orders.length;
  const completed = s.orders.filter(isCompleted).length;
  const cancelled = s.orders.filter((o) => o.status === "cancelled").length;
  const delayed = s.orders.filter((o) => o.status === "delayed").length;
  const durations = s.orders
    .map((o) => (o.pickup_at && o.dropoff_at
      ? Math.round((new Date(o.dropoff_at).getTime() - new Date(o.pickup_at).getTime()) / 60000)
      : null))
    .filter((x): x is number => x != null && x > 0);
  const distances = s.orders.map((o) => Number(o.distance_km ?? 0)).filter((x) => x > 0);
  const revenue = s.orders.reduce((a, o) => a + orderRevenue(o).value, 0);

  const byStatus = [...s.orders.reduce((m, o) => {
    m.set(o.status, (m.get(o.status) ?? 0) + 1);
    return m;
  }, new Map<OrderStatus, number>())]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    completed,
    pending: s.orders.filter((o) => o.status === "pending").length,
    cancelled,
    inTransit: s.orders.filter((o) => o.status === "in_transit").length,
    delayed,
    avgDeliveryMinutes: durations.length ? Math.round(durations.reduce((a, n) => a + n, 0) / durations.length) : null,
    avgDistanceKm: distances.length ? Math.round(distances.reduce((a, n) => a + n, 0) / distances.length) : null,
    avgOrderValue: total ? Math.round(revenue / total) : 0,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    cancellationRate: total ? Math.round((cancelled / total) * 100) : 0,
    delayRate: total ? Math.round((delayed / total) * 100) : 0,
    byStatus,
  };
}

export type DeliveryPerformance = {
  onTime: number; late: number; measurable: number;
  onTimeRate: number | null;
  avgDurationMinutes: number | null;
  avgDistanceKm: number | null;
  completionRate: number;
  delayedNow: number;
};

/** On-time = delivered on or before the planned dropoff time recorded on the order. */
export function deliveryPerformance(s: ReportDataset): DeliveryPerformance {
  const done = s.orders.filter(isCompleted);
  const measurable = done.filter((o) => o.dropoff_at && o.eta_minutes != null && o.pickup_at);
  let onTime = 0;
  let late = 0;
  const durations: number[] = [];
  for (const o of measurable) {
    const mins = Math.round((new Date(o.dropoff_at!).getTime() - new Date(o.pickup_at!).getTime()) / 60000);
    durations.push(mins);
    if (mins <= Number(o.eta_minutes) * 1.1) onTime++;
    else late++;
  }
  const distances = done.map((o) => Number(o.distance_km ?? 0)).filter((x) => x > 0);
  return {
    onTime,
    late,
    measurable: measurable.length,
    onTimeRate: measurable.length ? Math.round((onTime / measurable.length) * 100) : null,
    avgDurationMinutes: durations.length ? Math.round(durations.reduce((a, n) => a + n, 0) / durations.length) : null,
    avgDistanceKm: distances.length ? Math.round(distances.reduce((a, n) => a + n, 0) / distances.length) : null,
    completionRate: s.orders.length ? Math.round((done.length / s.orders.length) * 100) : 0,
    delayedNow: s.orders.filter((o) => o.status === "delayed").length,
  };
}

/* ------------------------------------------------------------------ */
/* Expenses & fuel                                                     */
/* ------------------------------------------------------------------ */

export function expensesByCategory(s: ReportDataset): Series {
  const map = new Map<string, number>();
  for (const e of s.expenses) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount ?? 0));
  return [...map.entries()].map(([label, value]) => ({ id: label, label, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}

export function expensesByVehicle(s: ReportDataset): Series {
  const map = new Map<string, number>();
  for (const e of s.expenses) {
    if (!e.truck_id) continue;
    map.set(e.truck_id, (map.get(e.truck_id) ?? 0) + Number(e.amount ?? 0));
  }
  return [...map.entries()].map(([id, value]) => {
    const v = s.vehicles.find((x) => x.id === id);
    return { id, label: v?.plate ?? "Unknown vehicle", sub: v?.truck_model ?? undefined, value: Math.round(value) };
  }).sort((a, b) => b.value - a.value);
}

export function expenseTrend(s: ReportDataset): Series {
  const map = new Map<string, number>();
  for (const e of s.expenses) {
    const d = new Date(e.expense_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + Number(e.amount ?? 0));
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
    .map(([key, value]) => ({
      label: new Date(`${key}-01`).toLocaleString(undefined, { month: "short" }),
      value: Math.round(value),
    }));
}

export type FuelAnalytics = {
  totalCost: number;
  litres: number;
  hasLogs: boolean;
  distanceKm: number;
  costPerKm: number | null;
  kmPerLitre: number | null;
  byVehicle: { id: string; label: string; cost: number; litres: number; costPerKm: number | null }[];
  trend: Series;
  fuelExpenseTotal: number;
};

/**
 * Fuel figures come from manually recorded fuel logs and finance expense rows.
 * There is no fuel telemetry in the system, so efficiency is derived from
 * recorded litres against order distance and is labelled as such in the UI.
 */
export function fuelAnalytics(s: ReportDataset): FuelAnalytics {
  const totalCost = s.fuel.reduce((a, f) => a + Number(f.cost ?? 0), 0);
  const litres = s.fuel.reduce((a, f) => a + Number(f.litres ?? 0), 0);
  const distanceKm = s.orders.reduce((a, o) => a + Number(o.distance_km ?? 0), 0);
  const fuelExpenseTotal = s.expenses.filter((e) => e.category === "fuel")
    .reduce((a, e) => a + Number(e.amount ?? 0), 0);

  const byVehicle = [...s.fuel.reduce((m, f) => {
    const cur = m.get(f.truck_id) ?? { cost: 0, litres: 0 };
    cur.cost += Number(f.cost ?? 0);
    cur.litres += Number(f.litres ?? 0);
    m.set(f.truck_id, cur);
    return m;
  }, new Map<string, { cost: number; litres: number }>())].map(([id, v]) => {
    const veh = s.vehicles.find((x) => x.id === id);
    const km = s.orders.filter((o) => o.truck_id === id).reduce((a, o) => a + Number(o.distance_km ?? 0), 0);
    return {
      id,
      label: veh?.plate ?? "Unknown vehicle",
      cost: Math.round(v.cost),
      litres: Math.round(v.litres),
      costPerKm: km > 0 ? Math.round((v.cost / km) * 100) / 100 : null,
    };
  }).sort((a, b) => b.cost - a.cost);

  const trendMap = new Map<string, number>();
  for (const f of s.fuel) {
    const d = new Date(f.filled_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    trendMap.set(key, (trendMap.get(key) ?? 0) + Number(f.cost ?? 0));
  }

  return {
    totalCost: Math.round(totalCost),
    litres: Math.round(litres),
    hasLogs: s.fuel.length > 0,
    distanceKm: Math.round(distanceKm),
    costPerKm: distanceKm > 0 && totalCost > 0 ? Math.round((totalCost / distanceKm) * 100) / 100 : null,
    kmPerLitre: litres > 0 && distanceKm > 0 ? Math.round((distanceKm / litres) * 10) / 10 : null,
    byVehicle,
    trend: [...trendMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12)
      .map(([key, value]) => ({
        label: new Date(`${key}-01`).toLocaleString(undefined, { month: "short" }),
        value: Math.round(value),
      })),
    fuelExpenseTotal: Math.round(fuelExpenseTotal),
  };
}
