/** Driver Management module — shared types, status metadata and derived logic. */

export type DriverStatus =
  | "available" | "assigned" | "driving" | "loading" | "offloading"
  | "rest_break" | "off_duty" | "on_leave" | "suspended";

export const DRIVER_STATUS_META: Record<
  DriverStatus,
  { label: string; chip: string; dot: string; marker: string }
> = {
  available:  { label: "Available",  chip: "status-success", dot: "bg-emerald-500", marker: "#10b981" },
  assigned:   { label: "Assigned",   chip: "status-info",    dot: "bg-sky-500",     marker: "#0ea5e9" },
  driving:    { label: "On Trip",    chip: "status-info",    dot: "bg-blue-500",    marker: "#3b82f6" },
  loading:    { label: "Loading",    chip: "status-info",    dot: "bg-violet-500",  marker: "#8b5cf6" },
  offloading: { label: "Offloading", chip: "status-info",    dot: "bg-teal-500",    marker: "#14b8a6" },
  rest_break: { label: "Rest Break", chip: "status-warning", dot: "bg-amber-500",   marker: "#f59e0b" },
  off_duty:   { label: "Off Duty",   chip: "status-warning", dot: "bg-orange-500",  marker: "#f97316" },
  on_leave:   { label: "On Leave",   chip: "status-warning", dot: "bg-yellow-600",  marker: "#ca8a04" },
  suspended:  { label: "Suspended",  chip: "status-urgent",  dot: "bg-rose-600",    marker: "#e11d48" },
};

export const DRIVER_STATUSES = Object.keys(DRIVER_STATUS_META) as DriverStatus[];

/** Statuses in which a driver is actively working a job. */
export const DRIVER_BUSY_STATUSES: DriverStatus[] = ["assigned", "driving", "loading", "offloading"];
/** Statuses in which a driver may take a new job. */
export const DRIVER_ASSIGNABLE_STATUSES: DriverStatus[] = ["available"];
/** Statuses that mean the driver is not working today. */
export const DRIVER_OFF_STATUSES: DriverStatus[] = ["off_duty", "rest_break"];

export type DriverRow = {
  id: string;
  owner_id: string;
  user_id: string | null;
  employee_id: string | null;
  full_name: string;
  photo_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  national_id_no: string | null;
  passport_no: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_group: string | null;
  licence_no: string | null;
  licence_class: string | null;
  licence_issue_date: string | null;
  licence_expiry: string | null;
  medical_expiry: string | null;
  branch: string | null;
  department: string | null;
  hire_date: string | null;
  employment_type: string | null;
  employment_status: string;
  years_experience: number | null;
  assigned_truck_id: string | null;
  current_order_id: string | null;
  status: DriverStatus;
  status_changed_at: string;
  status_note: string | null;
  rating: number;
  total_trips: number;
  on_time_trips: number;
  distance_km: number;
  hours_driven: number;
  current_lat: number | null;
  current_lng: number | null;
  location_updated_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverFilter = "all" | "available" | "on_trip" | "off_duty" | "suspended";

export const DRIVER_FILTERS: { key: DriverFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "available", label: "Available" },
  { key: "on_trip", label: "On Trip" },
  { key: "off_duty", label: "Off Duty" },
  { key: "suspended", label: "Suspended" },
];

export function matchesDriverFilter(status: DriverStatus, f: DriverFilter): boolean {
  if (f === "all") return true;
  if (f === "available") return status === "available";
  if (f === "on_trip") return DRIVER_BUSY_STATUSES.includes(status);
  if (f === "off_duty") return DRIVER_OFF_STATUSES.includes(status) || status === "on_leave";
  return status === "suspended";
}

export const LICENCE_CLASSES = ["A", "B", "C", "CE", "D", "DE", "E", "F", "G"];
export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];
export const BLOOD_GROUPS = ["Unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const EMPLOYMENT_TYPES = ["Permanent", "Contract", "Casual", "Owner-operator"];
export const EMPLOYMENT_STATUSES = ["active", "probation", "suspended", "terminated"];
export const DEPARTMENTS = ["Operations", "Heavy Haulage", "Long Distance", "Local Distribution", "Workshop"];

export const DRIVER_DOC_KINDS = [
  { key: "licence", label: "Driving Licence" },
  { key: "national_id", label: "National ID" },
  { key: "passport", label: "Passport" },
  { key: "medical", label: "Medical Certificate" },
  { key: "police_clearance", label: "Police Clearance" },
  { key: "contract", label: "Employment Contract" },
  { key: "certification", label: "Additional Certification" },
  { key: "other", label: "Other Document" },
];

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date + "T00:00:00").getTime() - Date.now()) / 86_400_000);
}

export function licenceValid(d: Pick<DriverRow, "licence_expiry">): boolean {
  const n = daysUntil(d.licence_expiry);
  return n === null ? true : n >= 0;
}

/** Central eligibility rule used by both Fleet and Orders assignment flows. */
export function driverAssignmentIssue(d: DriverRow): string | null {
  if (d.status === "suspended") return `${d.full_name} is suspended and cannot be assigned.`;
  if (d.status === "on_leave") return `${d.full_name} is on leave.`;
  if (DRIVER_BUSY_STATUSES.includes(d.status)) return `${d.full_name} is already on an active trip.`;
  if (!licenceValid(d)) return `${d.full_name}'s driving licence has expired.`;
  if (d.employment_status === "terminated") return `${d.full_name} is no longer employed.`;
  if (!DRIVER_ASSIGNABLE_STATUSES.includes(d.status)) {
    return `${d.full_name} is ${DRIVER_STATUS_META[d.status].label.toLowerCase()} and unavailable.`;
  }
  return null;
}

export type DriverAlert = {
  id: string;
  driverId: string;
  name: string;
  kind: "licence" | "medical" | "inactive" | "unassigned" | "unavailable" | "missed";
  title: string;
  detail: string;
  severity: "warning" | "urgent";
};

export function buildDriverAlerts(drivers: DriverRow[]): DriverAlert[] {
  const out: DriverAlert[] = [];
  for (const d of drivers) {
    const name = d.employee_id ? `${d.employee_id} · ${d.full_name}` : d.full_name;

    const lic = daysUntil(d.licence_expiry);
    if (lic !== null && lic <= 45) {
      out.push({
        id: `${d.id}-lic`, driverId: d.id, name, kind: "licence",
        title: lic < 0 ? "Licence expired" : "Licence expiring",
        detail: lic < 0 ? `Expired ${Math.abs(lic)} days ago` : `Expires in ${lic} days`,
        severity: lic <= 14 ? "urgent" : "warning",
      });
    }

    const med = daysUntil(d.medical_expiry);
    if (med !== null && med <= 30) {
      out.push({
        id: `${d.id}-med`, driverId: d.id, name, kind: "medical",
        title: med < 0 ? "Medical expired" : "Medical expiring",
        detail: med < 0 ? `Expired ${Math.abs(med)} days ago` : `Expires in ${med} days`,
        severity: med <= 7 ? "urgent" : "warning",
      });
    }

    if (d.status === "suspended") {
      out.push({
        id: `${d.id}-susp`, driverId: d.id, name, kind: "unavailable",
        title: "Driver suspended", detail: d.status_note || "Cannot be dispatched", severity: "urgent",
      });
    }

    if (!d.assigned_truck_id && d.status !== "on_leave" && d.status !== "suspended") {
      out.push({
        id: `${d.id}-veh`, driverId: d.id, name, kind: "unassigned",
        title: "No vehicle assigned", detail: "Assign a vehicle to dispatch this driver", severity: "warning",
      });
    }

    const stale = d.location_updated_at
      ? Date.now() - new Date(d.location_updated_at).getTime() > 7 * 86_400_000
      : true;
    if (stale && DRIVER_BUSY_STATUSES.includes(d.status)) {
      out.push({
        id: `${d.id}-loc`, driverId: d.id, name, kind: "inactive",
        title: "Driver inactive", detail: "On a trip but not sharing location", severity: "warning",
      });
    }
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "urgent" ? -1 : 1));
}

export function driverKpis(drivers: DriverRow[], tripsToday: number) {
  const rated = drivers.filter((d) => Number(d.rating) > 0);
  return {
    total: drivers.length,
    available: drivers.filter((d) => d.status === "available").length,
    onTrip: drivers.filter((d) => DRIVER_BUSY_STATUSES.includes(d.status)).length,
    offDuty: drivers.filter((d) => DRIVER_OFF_STATUSES.includes(d.status)).length,
    onLeave: drivers.filter((d) => d.status === "on_leave").length,
    expiredLicence: drivers.filter((d) => !licenceValid(d)).length,
    avgRating: rated.length
      ? (rated.reduce((s, d) => s + Number(d.rating), 0) / rated.length).toFixed(1)
      : "—",
    tripsToday,
  };
}

export function onTimeRate(d: DriverRow): number {
  if (!d.total_trips) return 0;
  return Math.round((d.on_time_trips / d.total_trips) * 100);
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}
