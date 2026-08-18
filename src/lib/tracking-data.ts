/**
 * Tracking & Dispatch Center — shared derivation logic.
 *
 * This module contains NO data of its own: every value is derived from the
 * existing Orders, Fleet (trucks), Driver and Client records. It is the single
 * place where dispatch KPIs, alerts, ETA/route maths and telemetry provenance
 * are computed so the map, panels and sheets all agree.
 */
import { VEHICLE_STATUS_META, daysUntil, type VehicleRow, type VehicleStatus } from "@/lib/fleet-data";
import { DRIVER_STATUS_META, driverAssignmentIssue, type DriverRow } from "@/lib/driver-data-model";
import { ORDER_TIMELINE, type OrderRow, type OrderStatus } from "@/lib/orders-data";

export type LatLng = { lat: number; lng: number };

/* ------------------------------------------------------------------ */
/* Geo helpers                                                         */
/* ------------------------------------------------------------------ */

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function minutesFor(km: number, avgKmh = 45): number {
  return Math.max(1, Math.round((km / avgKmh) * 60));
}

export function fmtDuration(mins: number | null | undefined): string {
  if (mins == null) return "—";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/* ------------------------------------------------------------------ */
/* Telemetry provenance — extension point for real GPS integrations    */
/* ------------------------------------------------------------------ */

/**
 * Where a position came from. Today every position is `record` (the last
 * position written to the trucks/drivers tables) or `simulated` (derived from
 * the order route because no device has ever reported).
 *
 * Future providers (Wialon, Teltonika trackers, telematics gateways, driver
 * phone GPS) plug in by adding a source here and a resolver in
 * `TELEMETRY_PROVIDERS` — no consumer of this module needs to change.
 */
export type TelemetrySource = "device" | "phone" | "record" | "simulated" | "none";

export const TELEMETRY_META: Record<TelemetrySource, { label: string; note: string; live: boolean }> = {
  device:    { label: "Live GPS tracker",  note: "Reported by the on-board tracker",           live: true },
  phone:     { label: "Driver phone GPS",  note: "Reported by the driver app",                 live: true },
  record:    { label: "Last known",        note: "Last position saved to the vehicle record",  live: false },
  simulated: { label: "Simulated",         note: "Estimated from the order route — not GPS",   live: false },
  none:      { label: "No location",       note: "Nothing has ever reported for this unit",    live: false },
};

/**
 * Registered telemetry providers. Only the built-in record/simulation reader is
 * wired today; external integrations (Wialon, geofencing, traffic-aware ETA)
 * register here later without touching the Dispatch Center UI.
 */
export const TELEMETRY_PROVIDERS: {
  id: string;
  label: string;
  enabled: boolean;
  capabilities: ("position" | "speed" | "geofence" | "traffic_eta")[];
}[] = [
  { id: "loadlink_records", label: "LoadLink records", enabled: true, capabilities: ["position"] },
  { id: "driver_phone", label: "Driver phone GPS", enabled: false, capabilities: ["position", "speed"] },
  { id: "wialon", label: "Wialon", enabled: false, capabilities: ["position", "speed", "geofence"] },
  { id: "telematics", label: "Vehicle telematics", enabled: false, capabilities: ["position", "speed", "traffic_eta"] },
];

export type Telemetry = {
  pos: LatLng | null;
  source: TelemetrySource;
  updatedAt: string | null;
  /** km/h where the source reports it; null when unknown. */
  speedKmh: number | null;
};

/** Resolves the best position we currently have for a vehicle. */
export function vehicleTelemetry(v: VehicleRow | null | undefined, order?: OrderRow | null): Telemetry {
  if (v?.current_lat != null && v?.current_lng != null) {
    const fresh = v.location_updated_at
      ? Date.now() - new Date(v.location_updated_at).getTime() < 15 * 60_000
      : false;
    return {
      pos: { lat: v.current_lat, lng: v.current_lng },
      source: fresh && v.tracker_status === "online" ? "device" : "record",
      updatedAt: v.location_updated_at,
      speedKmh: null,
    };
  }
  const sim = simulatedPosition(order);
  if (sim) return { pos: sim, source: "simulated", updatedAt: order?.updated_at ?? null, speedKmh: null };
  return { pos: null, source: "none", updatedAt: null, speedKmh: null };
}

export function driverTelemetry(d: DriverRow | null | undefined, order?: OrderRow | null): Telemetry {
  if (d?.current_lat != null && d?.current_lng != null) {
    return {
      pos: { lat: d.current_lat, lng: d.current_lng },
      source: "phone",
      updatedAt: d.location_updated_at,
      speedKmh: null,
    };
  }
  const sim = simulatedPosition(order);
  if (sim) return { pos: sim, source: "simulated", updatedAt: order?.updated_at ?? null, speedKmh: null };
  return { pos: null, source: "none", updatedAt: null, speedKmh: null };
}

/** Progress along the pickup → dropoff line implied by the order status. */
export function statusProgress(status: OrderStatus): number {
  const map: Partial<Record<OrderStatus, number>> = {
    pending: 0, confirmed: 0, assigned: 0, en_route_pickup: 0.1,
    arrived_pickup: 0.15, loading: 0.2, in_transit: 0.6, delayed: 0.6,
    arrived_dropoff: 0.95, delivered: 1, completed: 1,
  };
  return map[status] ?? 0;
}

/** Estimated position along the order route — explicitly NOT GPS. */
export function simulatedPosition(order: OrderRow | null | undefined): LatLng | null {
  if (!order?.pickup_lat || !order?.pickup_lng || !order?.dropoff_lat || !order?.dropoff_lng) return null;
  const t = statusProgress(order.status);
  return {
    lat: order.pickup_lat + (order.dropoff_lat - order.pickup_lat) * t,
    lng: order.pickup_lng + (order.dropoff_lng - order.pickup_lng) * t,
  };
}

export type RouteMetrics = {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  current: LatLng | null;
  totalKm: number | null;
  remainingKm: number | null;
  etaMinutes: number | null;
  progressPct: number;
};

export function routeMetrics(order: OrderRow, current: LatLng | null): RouteMetrics {
  const pickup = order.pickup_lat != null && order.pickup_lng != null
    ? { lat: order.pickup_lat, lng: order.pickup_lng } : null;
  const dropoff = order.dropoff_lat != null && order.dropoff_lng != null
    ? { lat: order.dropoff_lat, lng: order.dropoff_lng } : null;
  const totalKm = order.distance_km != null
    ? Number(order.distance_km)
    : pickup && dropoff ? haversineKm(pickup, dropoff) : null;
  const remainingKm = current && dropoff ? haversineKm(current, dropoff) : totalKm;
  const eta = remainingKm != null ? minutesFor(remainingKm) : order.eta_minutes ?? null;
  const progressPct = totalKm && remainingKm != null
    ? Math.min(100, Math.max(0, Math.round((1 - remainingKm / Math.max(totalKm, 0.1)) * 100)))
    : Math.round(statusProgress(order.status) * 100);
  return { pickup, dropoff, current, totalKm, remainingKm, etaMinutes: eta, progressPct };
}

/* ------------------------------------------------------------------ */
/* Order classification                                                */
/* ------------------------------------------------------------------ */

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "confirmed", "assigned", "en_route_pickup", "arrived_pickup",
  "loading", "in_transit", "delayed", "arrived_dropoff",
];

export const MOVING_STATUSES: OrderStatus[] = ["en_route_pickup", "in_transit", "delayed"];

export function isActiveOrder(o: OrderRow): boolean {
  return !o.archived && ACTIVE_ORDER_STATUSES.includes(o.status);
}

export function isUnassigned(o: OrderRow): boolean {
  return !o.archived && (o.status === "pending" || o.status === "confirmed") && (!o.truck_id || !o.driver_id);
}

export type Priority = "critical" | "high" | "normal";

export const PRIORITY_META: Record<Priority, { label: string; chip: string }> = {
  critical: { label: "Critical", chip: "status-urgent" },
  high: { label: "High", chip: "status-warning" },
  normal: { label: "Normal", chip: "status-info" },
};

/** Derived from lateness against the promised drop-off, plus delay status. */
export function orderPriority(o: OrderRow): Priority {
  if (o.status === "delayed") return "critical";
  if (o.dropoff_at) {
    const mins = (new Date(o.dropoff_at).getTime() - Date.now()) / 60000;
    if (mins < 0) return "critical";
    if (mins < 120) return "high";
  }
  if (isUnassigned(o) && o.pickup_at && new Date(o.pickup_at).getTime() - Date.now() < 3 * 3600_000) return "high";
  return "normal";
}

export function isDelayed(o: OrderRow): boolean {
  if (o.status === "delayed") return true;
  if (!o.dropoff_at) return false;
  if (["delivered", "completed", "cancelled"].includes(o.status)) return false;
  return new Date(o.dropoff_at).getTime() < Date.now();
}

/* ------------------------------------------------------------------ */
/* KPIs                                                                */
/* ------------------------------------------------------------------ */

export type DispatchKpis = {
  activeDeliveries: number;
  vehiclesMoving: number;
  driversOnDuty: number;
  delayed: number;
  offlineVehicles: number;
  unassigned: number;
};

export function dispatchKpis(orders: OrderRow[], vehicles: VehicleRow[], drivers: DriverRow[]): DispatchKpis {
  return {
    activeDeliveries: orders.filter(isActiveOrder).length,
    vehiclesMoving: vehicles.filter((v) => v.status === "on_trip").length,
    driversOnDuty: drivers.filter((d) => d.status !== "off_duty" && d.status !== "on_leave" && d.status !== "suspended").length,
    delayed: orders.filter((o) => !o.archived && isDelayed(o)).length,
    offlineVehicles: vehicles.filter((v) => v.status === "offline" || v.tracker_status === "offline").length,
    unassigned: orders.filter(isUnassigned).length,
  };
}

/* ------------------------------------------------------------------ */
/* Operational alerts                                                  */
/* ------------------------------------------------------------------ */

export type DispatchAlertKind =
  | "delayed_delivery" | "vehicle_offline" | "driver_unavailable" | "tracker_offline"
  | "maintenance" | "insurance" | "licence" | "route_deviation";

export type DispatchAlert = {
  id: string;
  kind: DispatchAlertKind;
  title: string;
  detail: string;
  severity: "urgent" | "warning" | "info";
  orderId?: string;
  vehicleId?: string;
  driverId?: string;
};

export const ALERT_META: Record<DispatchAlertKind, { label: string }> = {
  delayed_delivery: { label: "Delayed delivery" },
  vehicle_offline: { label: "Vehicle offline" },
  driver_unavailable: { label: "Driver unavailable" },
  tracker_offline: { label: "Tracker offline" },
  maintenance: { label: "Maintenance required" },
  insurance: { label: "Insurance expiry" },
  licence: { label: "Licence expiry" },
  route_deviation: { label: "Route deviation" },
};

export function buildDispatchAlerts(
  orders: OrderRow[],
  vehicles: VehicleRow[],
  drivers: DriverRow[],
): DispatchAlert[] {
  const out: DispatchAlert[] = [];

  for (const o of orders) {
    if (!o.archived && isDelayed(o)) {
      out.push({
        id: `order-${o.id}-delay`, kind: "delayed_delivery", severity: "urgent",
        title: `${o.order_number} is delayed`,
        detail: `${o.client_name} · ${o.dropoff_address}`,
        orderId: o.id,
      });
    }
  }

  for (const v of vehicles) {
    const label = v.fleet_number ? `${v.fleet_number} · ${v.plate}` : v.plate;
    if (v.status === "offline") {
      out.push({
        id: `veh-${v.id}-offline`, kind: "vehicle_offline", severity: "warning",
        title: `${label} is offline`, detail: `Last update ${fmtAgo(v.location_updated_at)}`, vehicleId: v.id,
      });
    }
    if (v.tracker_id && v.tracker_status === "offline") {
      out.push({
        id: `veh-${v.id}-tracker`, kind: "tracker_offline", severity: "warning",
        title: `Tracker not reporting · ${label}`, detail: `Device ${v.tracker_id}`, vehicleId: v.id,
      });
    }
    const svc = daysUntil(v.next_service_date);
    if (svc !== null && svc <= 14) {
      out.push({
        id: `veh-${v.id}-svc`, kind: "maintenance", severity: svc < 0 ? "urgent" : "warning",
        title: `Service ${svc < 0 ? "overdue" : "due"} · ${label}`,
        detail: svc < 0 ? `${Math.abs(svc)} days overdue` : `Due in ${svc} days`, vehicleId: v.id,
      });
    }
    const ins = daysUntil(v.insurance_expiry);
    if (ins !== null && ins <= 30) {
      out.push({
        id: `veh-${v.id}-ins`, kind: "insurance", severity: ins <= 7 ? "urgent" : "warning",
        title: `Insurance ${ins < 0 ? "expired" : "expiring"} · ${label}`,
        detail: ins < 0 ? `${Math.abs(ins)} days ago` : `In ${ins} days`, vehicleId: v.id,
      });
    }
  }

  for (const d of drivers) {
    if (d.status === "suspended" || d.employment_status === "terminated") {
      out.push({
        id: `drv-${d.id}-unavail`, kind: "driver_unavailable", severity: "urgent",
        title: `${d.full_name} unavailable`, detail: d.status_note || DRIVER_STATUS_META[d.status].label, driverId: d.id,
      });
    }
    const lic = daysUntil(d.licence_expiry);
    if (lic !== null && lic <= 30) {
      out.push({
        id: `drv-${d.id}-lic`, kind: "licence", severity: lic < 0 ? "urgent" : "warning",
        title: `Licence ${lic < 0 ? "expired" : "expiring"} · ${d.full_name}`,
        detail: lic < 0 ? `${Math.abs(lic)} days ago` : `In ${lic} days`, driverId: d.id,
      });
    }
  }

  const rank = { urgent: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* ------------------------------------------------------------------ */
/* Dispatch board                                                      */
/* ------------------------------------------------------------------ */

export type BoardColumn = {
  key: string;
  label: string;
  statuses: OrderStatus[];
  /** Column also requires the order to be missing an assignment. */
  unassignedOnly?: boolean;
};

export const BOARD_COLUMNS: BoardColumn[] = [
  { key: "unassigned", label: "Unassigned", statuses: ["pending", "confirmed"], unassignedOnly: true },
  { key: "assigned", label: "Assigned", statuses: ["assigned"] },
  { key: "en_route", label: "En Route", statuses: ["en_route_pickup", "arrived_pickup"] },
  { key: "loading", label: "Loading", statuses: ["loading"] },
  { key: "in_transit", label: "In Transit", statuses: ["in_transit", "delayed", "arrived_dropoff"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
  { key: "completed", label: "Completed", statuses: ["completed"] },
];

export function columnFor(o: OrderRow): string {
  if (isUnassigned(o)) return "unassigned";
  const col = BOARD_COLUMNS.find((c) => !c.unassignedOnly && c.statuses.includes(o.status));
  return col?.key ?? "assigned";
}

/* ------------------------------------------------------------------ */
/* Assignment eligibility (re-uses the existing module rules)          */
/* ------------------------------------------------------------------ */

/** Reason a vehicle cannot take a new trip, or null when it is eligible. */
export function vehicleAssignmentIssue(v: VehicleRow, activeOrders: OrderRow[]): string | null {
  if (v.status === "maintenance") return "In maintenance";
  if (v.status === "out_of_service") return "Out of service";
  if (v.status === "offline") return "Offline";
  if (v.current_order_id) return "Already on an active trip";
  if (activeOrders.some((o) => o.truck_id === v.id)) return "Already assigned to an active order";
  if (!["available", "idle"].includes(v.status)) return VEHICLE_STATUS_META[v.status].label;
  return null;
}

export { driverAssignmentIssue };

export function vehicleMarkerColor(status: VehicleStatus): string {
  return VEHICLE_STATUS_META[status].marker;
}

export function timelineIndex(status: OrderStatus): number {
  return ORDER_TIMELINE.indexOf(status);
}
