export type OrderStatus =
  | "pending" | "confirmed" | "assigned" | "en_route_pickup" | "arrived_pickup"
  | "loading" | "in_transit" | "delayed" | "arrived_dropoff" | "delivered"
  | "completed" | "cancelled";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; dot: string }> = {
  pending:         { label: "Pending",          color: "bg-amber-100 text-amber-800",   dot: "bg-amber-500" },
  confirmed:       { label: "Confirmed",        color: "bg-blue-100 text-blue-800",     dot: "bg-blue-500" },
  assigned:        { label: "Assigned",         color: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
  en_route_pickup: { label: "En Route",         color: "bg-cyan-100 text-cyan-800",     dot: "bg-cyan-500" },
  arrived_pickup:  { label: "At Pickup",        color: "bg-sky-100 text-sky-800",       dot: "bg-sky-500" },
  loading:         { label: "Loading",          color: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  in_transit:      { label: "In Transit",       color: "bg-primary/15 text-primary",    dot: "bg-primary" },
  delayed:         { label: "Delayed",          color: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  arrived_dropoff: { label: "At Dropoff",       color: "bg-teal-100 text-teal-800",     dot: "bg-teal-500" },
  delivered:       { label: "Delivered",        color: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  completed:       { label: "Completed",        color: "bg-emerald-200 text-emerald-900", dot: "bg-emerald-600" },
  cancelled:       { label: "Cancelled",        color: "bg-rose-100 text-rose-800",     dot: "bg-rose-500" },
};

export const ORDER_TIMELINE: OrderStatus[] = [
  "pending","confirmed","assigned","en_route_pickup","arrived_pickup",
  "loading","in_transit","arrived_dropoff","delivered","completed",
];

export const CARGO_CATEGORIES = [
  "Heavy Machinery","Construction Equipment","Containers","Vehicles",
  "Building Materials","Agricultural","Industrial","Other",
];

export type OrderRow = {
  id: string;
  order_number: string;
  created_by: string;
  fleet_owner_user_id: string | null;
  client_id: string | null;
  crm_client_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_contact_name: string | null;
  pickup_contact_phone: string | null;
  pickup_notes: string | null;
  pickup_at: string | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_contact_name: string | null;
  dropoff_contact_phone: string | null;
  dropoff_notes: string | null;
  dropoff_at: string | null;
  cargo_name: string | null;
  cargo_category: string | null;
  cargo_weight_tons: number | null;
  cargo_dimensions: string | null;
  cargo_quantity: number | null;
  special_instructions: string | null;
  truck_id: string | null;
  driver_id: string | null;
  distance_km: number | null;
  eta_minutes: number | null;
  price_per_km: number;
  base_charge: number;
  fuel_surcharge: number;
  toll_charges: number;
  loading_fee: number;
  offloading_fee: number;
  extra_charges: number;
  estimated_total: number;
  final_total: number | null;
  status: OrderStatus;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export function computeTotal(o: {
  distance_km?: number | null; price_per_km?: number | null; base_charge?: number | null;
  fuel_surcharge?: number | null; toll_charges?: number | null;
  loading_fee?: number | null; offloading_fee?: number | null; extra_charges?: number | null;
}): number {
  const dist = Number(o.distance_km ?? 0) * Number(o.price_per_km ?? 0);
  return Math.round(
    dist + Number(o.base_charge ?? 0) + Number(o.fuel_surcharge ?? 0) +
    Number(o.toll_charges ?? 0) + Number(o.loading_fee ?? 0) +
    Number(o.offloading_fee ?? 0) + Number(o.extra_charges ?? 0)
  );
}

export function ksh(n: number | null | undefined): string {
  return `KSh ${Number(n ?? 0).toLocaleString()}`;
}
