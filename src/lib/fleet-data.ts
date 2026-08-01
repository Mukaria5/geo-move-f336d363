export type VehicleStatus =
  | "available" | "assigned" | "loading" | "on_trip"
  | "offloading" | "maintenance" | "out_of_service" | "offline" | "idle";

export const VEHICLE_STATUS_META: Record<
  VehicleStatus,
  { label: string; chip: string; dot: string; marker: string }
> = {
  available:      { label: "Available",      chip: "status-success", dot: "bg-emerald-500", marker: "#10b981" },
  assigned:       { label: "Assigned",       chip: "status-info",    dot: "bg-sky-500",     marker: "#0ea5e9" },
  loading:        { label: "Loading",        chip: "status-info",    dot: "bg-violet-500",  marker: "#8b5cf6" },
  on_trip:        { label: "On Trip",        chip: "status-info",    dot: "bg-blue-500",    marker: "#3b82f6" },
  offloading:     { label: "Offloading",     chip: "status-info",    dot: "bg-teal-500",    marker: "#14b8a6" },
  maintenance:    { label: "Maintenance",    chip: "status-warning", dot: "bg-orange-500",  marker: "#f97316" },
  out_of_service: { label: "Out of Service", chip: "status-urgent",  dot: "bg-rose-600",    marker: "#e11d48" },
  offline:        { label: "Offline",        chip: "status-urgent",  dot: "bg-rose-500",    marker: "#ef4444" },
  idle:           { label: "Idle",           chip: "status-warning", dot: "bg-amber-500",   marker: "#f59e0b" },
};

export const VEHICLE_STATUSES = Object.keys(VEHICLE_STATUS_META) as VehicleStatus[];

/** Statuses a vehicle may hold and still be assignable to a new order. */
export const ASSIGNABLE_STATUSES: VehicleStatus[] = ["available", "idle"];

export const BUSY_STATUSES: VehicleStatus[] = ["assigned", "loading", "on_trip", "offloading"];

export type FleetFilter = "all" | "available" | "on_trip" | "maintenance" | "offline";

export const FLEET_FILTERS: { key: FleetFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "on_trip", label: "On Trip" },
  { key: "maintenance", label: "Maintenance" },
  { key: "offline", label: "Offline" },
];

export function matchesFilter(status: VehicleStatus, f: FleetFilter): boolean {
  if (f === "all") return true;
  if (f === "available") return status === "available" || status === "idle";
  if (f === "on_trip") return BUSY_STATUSES.includes(status);
  if (f === "maintenance") return status === "maintenance" || status === "out_of_service";
  return status === "offline";
}

export const VEHICLE_TYPES = [
  "Low Loader", "Flatbed", "Tipper", "Prime Mover", "Box Truck",
  "Tanker", "Car Carrier", "Crane Truck", "Other",
];

export const FUEL_TYPES = ["Diesel", "Petrol", "Hybrid", "Electric"];
export const TRANSMISSIONS = ["Manual", "Automatic", "Semi-automatic"];
export const TRACKER_PROVIDERS = ["Not fitted", "Cartrack", "Track & Trace", "Fleetmatics", "Teltonika", "Other"];
export const TRACKER_DEVICE_STATUS = ["unknown", "online", "offline", "not_fitted"];

export const MAINTENANCE_TYPES = [
  "Routine service", "Oil change", "Tyre replacement", "Brake service",
  "Battery replacement", "Repair", "Inspection", "Other",
];

export const VEHICLE_DOC_KINDS = [
  { key: "insurance", label: "Insurance" },
  { key: "logbook", label: "Logbook" },
  { key: "inspection", label: "Inspection certificate" },
  { key: "road_licence", label: "Road licence" },
  { key: "photo", label: "Vehicle image" },
  { key: "other", label: "Other document" },
];

export type VehicleRow = {
  id: string;
  owner_id: string;
  fleet_owner_user_id: string | null;
  driver_id: string | null;
  truck_model: string;
  plate: string;
  capacity_tons: number;
  base_price: number;
  price_per_km: number;
  is_available: boolean;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  verified: boolean;
  notes: string | null;
  fleet_number: string | null;
  vehicle_type: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  chassis_no: string | null;
  axles: number | null;
  weight_kg: number | null;
  fuel_type: string | null;
  transmission: string | null;
  branch: string | null;
  photo_url: string | null;
  tracker_provider: string | null;
  tracker_id: string | null;
  tracker_sim: string | null;
  tracker_status: string | null;
  insurance_expiry: string | null;
  road_licence_expiry: string | null;
  last_service_date: string | null;
  next_service_date: string | null;
  fuel_level_pct: number | null;
  status: VehicleStatus;
  status_changed_at: string;
  current_order_id: string | null;
  created_at: string;
  updated_at: string;
};

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date + "T00:00:00").getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export type FleetAlert = {
  id: string;
  truckId: string;
  plate: string;
  kind: "insurance" | "road_licence" | "maintenance" | "inactive" | "tracker" | "fuel";
  title: string;
  detail: string;
  severity: "warning" | "urgent";
};

/** Derives the "Attention Required" alert list from vehicle rows. */
export function buildFleetAlerts(vehicles: VehicleRow[]): FleetAlert[] {
  const out: FleetAlert[] = [];
  for (const v of vehicles) {
    const label = v.fleet_number ? `${v.fleet_number} · ${v.plate}` : v.plate;

    const ins = daysUntil(v.insurance_expiry);
    if (ins !== null && ins <= 30) {
      out.push({
        id: `${v.id}-ins`, truckId: v.id, plate: label, kind: "insurance",
        title: "Insurance expiring",
        detail: ins < 0 ? `Expired ${Math.abs(ins)} days ago` : `Expires in ${ins} days`,
        severity: ins <= 7 ? "urgent" : "warning",
      });
    }

    const rl = daysUntil(v.road_licence_expiry);
    if (rl !== null && rl <= 30) {
      out.push({
        id: `${v.id}-rl`, truckId: v.id, plate: label, kind: "road_licence",
        title: "Road licence expiring",
        detail: rl < 0 ? `Expired ${Math.abs(rl)} days ago` : `Expires in ${rl} days`,
        severity: rl <= 7 ? "urgent" : "warning",
      });
    }

    const svc = daysUntil(v.next_service_date);
    if (svc !== null && svc <= 14) {
      out.push({
        id: `${v.id}-svc`, truckId: v.id, plate: label, kind: "maintenance",
        title: "Service due",
        detail: svc < 0 ? `Overdue by ${Math.abs(svc)} days` : `Due in ${svc} days`,
        severity: svc < 0 ? "urgent" : "warning",
      });
    }

    if (v.tracker_id && v.tracker_status === "offline") {
      out.push({
        id: `${v.id}-trk`, truckId: v.id, plate: label, kind: "tracker",
        title: "Tracker offline",
        detail: `Device ${v.tracker_id} not reporting`,
        severity: "warning",
      });
    }

    const stale = v.location_updated_at
      ? Date.now() - new Date(v.location_updated_at).getTime() > 7 * 86_400_000
      : true;
    if (stale && v.status !== "maintenance" && v.status !== "out_of_service") {
      out.push({
        id: `${v.id}-idle`, truckId: v.id, plate: label, kind: "inactive",
        title: "Vehicle inactive",
        detail: "No location reported in the last 7 days",
        severity: "warning",
      });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "urgent" ? -1 : 1));
}

export function utilization(vehicles: VehicleRow[]): number {
  if (!vehicles.length) return 0;
  const busy = vehicles.filter((v) => BUSY_STATUSES.includes(v.status)).length;
  return Math.round((busy / vehicles.length) * 100);
}

export function vehicleTitle(v: Pick<VehicleRow, "make" | "model" | "truck_model">): string {
  const composed = [v.make, v.model].filter(Boolean).join(" ");
  return composed || v.truck_model;
}

export function ksh(n: number | null | undefined): string {
  return `KSh ${Number(n ?? 0).toLocaleString()}`;
}
