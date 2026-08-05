/** Client Management (CRM) — shared types, metadata and derived logic. */

export type ClientStatus = "active" | "preferred" | "inactive" | "suspended";
export type ClientType = "business" | "individual";

export const CLIENT_STATUS_META: Record<
  ClientStatus,
  { label: string; chip: string; dot: string; marker: string }
> = {
  active:    { label: "Active",    chip: "status-success", dot: "bg-emerald-500", marker: "#10b981" },
  preferred: { label: "Preferred", chip: "status-info",    dot: "bg-sky-500",     marker: "#0ea5e9" },
  inactive:  { label: "Inactive",  chip: "status-warning", dot: "bg-amber-500",   marker: "#f59e0b" },
  suspended: { label: "Suspended", chip: "status-urgent",  dot: "bg-rose-500",    marker: "#f43f5e" },
};

export const CLIENT_STATUSES: ClientStatus[] = ["active", "preferred", "inactive", "suspended"];

export const INDUSTRIES = [
  "Construction", "Mining & Quarrying", "Agriculture", "Energy & Utilities",
  "Manufacturing", "Oil & Gas", "Infrastructure", "Logistics", "Government",
  "Retail & Distribution", "Other",
];

export const PAYMENT_TERMS: { value: string; label: string }[] = [
  { value: "due_on_receipt", label: "Due on receipt" },
  { value: "net_7", label: "Net 7 days" },
  { value: "net_15", label: "Net 15 days" },
  { value: "net_30", label: "Net 30 days" },
  { value: "net_60", label: "Net 60 days" },
  { value: "prepaid", label: "Prepaid" },
];

export const PAYMENT_METHODS = ["M-Pesa", "Bank transfer", "Cheque", "Cash", "Card"];
export const CURRENCIES = ["KES", "USD", "UGX", "TZS", "RWF"];
export const CONTACT_METHODS = ["phone", "email", "whatsapp", "sms"];

export const CLIENT_DOC_KINDS: { value: string; label: string }[] = [
  { value: "contract", label: "Contract" },
  { value: "sla", label: "Service Level Agreement" },
  { value: "tax_certificate", label: "Tax certificate" },
  { value: "business_registration", label: "Business registration" },
  { value: "purchase_order", label: "Purchase order" },
  { value: "other", label: "Other" },
];

export type ClientRow = {
  id: string;
  owner_id: string;
  client_code: string | null;
  name: string;
  client_type: ClientType;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  payment_terms: string | null;
  payment_method: string | null;
  currency: string;
  credit_limit: number | null;
  outstanding_balance: number;
  status: ClientStatus;
  customer_since: string;
  last_order_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientContactRow = {
  id: string;
  client_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  preferred_method: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientDocumentRow = {
  id: string;
  client_id: string;
  uploaded_by: string | null;
  kind: string;
  label: string | null;
  file_path: string;
  version: number;
  expires_on: string | null;
  created_at: string;
};

export type ClientNoteRow = {
  id: string;
  client_id: string;
  author_id: string | null;
  body: string;
  edited_at: string | null;
  edit_count: number;
  created_at: string;
};

export type ClientActivityRow = {
  id: string;
  client_id: string;
  actor_id: string | null;
  kind: string;
  title: string;
  detail: string | null;
  ref_id: string | null;
  created_at: string;
};

/** Minimal order shape the CRM needs from the Orders module. */
export type CrmOrderLite = {
  id: string;
  order_number: string;
  crm_client_id: string | null;
  status: string;
  created_at: string;
  estimated_total: number | null;
  final_total: number | null;
  pickup_address: string;
  dropoff_address: string;
  distance_km: number | null;
  truck_id: string | null;
  driver_id: string | null;
  dropoff_at: string | null;
};

export const OPEN_ORDER_STATUSES = [
  "pending", "confirmed", "assigned", "en_route_pickup", "arrived_pickup",
  "loading", "in_transit", "delayed", "arrived_dropoff",
];
const EARNED_STATUSES = ["delivered", "completed"];

export function orderValue(o: CrmOrderLite): number {
  return Number(o.final_total ?? o.estimated_total ?? 0);
}

export function isEarned(o: CrmOrderLite): boolean {
  return EARNED_STATUSES.includes(o.status);
}

export function clientRevenue(orders: CrmOrderLite[]): number {
  return orders.filter(isEarned).reduce((s, o) => s + orderValue(o), 0);
}

export function activeOrderCount(orders: CrmOrderLite[]): number {
  return orders.filter((o) => OPEN_ORDER_STATUSES.includes(o.status)).length;
}

export function lastOrderDate(client: ClientRow, orders: CrmOrderLite[]): string | null {
  const own = orders.filter((o) => o.crm_client_id === client.id);
  if (!own.length) return client.last_order_at;
  return own.reduce((a, b) => (a > b.created_at ? a : b.created_at), own[0].created_at);
}

export function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function clientCode(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "CLT";
  return `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export type CrmKpis = {
  total: number;
  active: number;
  newThisMonth: number;
  withActiveOrders: number;
  outstanding: number;
  lifetimeRevenue: number;
  repeatRate: number;
  avgOrderValue: number;
};

export function crmKpis(clients: ClientRow[], orders: CrmOrderLite[]): CrmKpis {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const byClient = new Map<string, CrmOrderLite[]>();
  for (const o of orders) {
    if (!o.crm_client_id) continue;
    const arr = byClient.get(o.crm_client_id) ?? [];
    arr.push(o);
    byClient.set(o.crm_client_id, arr);
  }
  const earned = orders.filter(isEarned);
  const lifetimeRevenue = earned.reduce((s, o) => s + orderValue(o), 0);
  const withOrders = [...byClient.values()].filter((a) => a.length > 0).length;
  const repeat = [...byClient.values()].filter((a) => a.length > 1).length;

  return {
    total: clients.length,
    active: clients.filter((c) => c.status === "active" || c.status === "preferred").length,
    newThisMonth: clients.filter((c) => new Date(c.created_at).getTime() >= monthStart).length,
    withActiveOrders: [...byClient.entries()]
      .filter(([, list]) => activeOrderCount(list) > 0).length,
    outstanding: clients.reduce((s, c) => s + Number(c.outstanding_balance ?? 0), 0),
    lifetimeRevenue,
    repeatRate: withOrders ? Math.round((repeat / withOrders) * 100) : 0,
    avgOrderValue: earned.length ? Math.round(lifetimeRevenue / earned.length) : 0,
  };
}

export type ClientFilter =
  | "all" | "active" | "preferred" | "inactive" | "suspended" | "recent" | "high_value";

export const CLIENT_FILTERS: { key: ClientFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "preferred", label: "Preferred" },
  { key: "inactive", label: "Inactive" },
  { key: "suspended", label: "Suspended" },
  { key: "recent", label: "Recent" },
  { key: "high_value", label: "High value" },
];

export type ClientSort = "recent" | "name" | "revenue" | "orders";

export const CLIENT_SORTS: { key: ClientSort; label: string }[] = [
  { key: "recent", label: "Newest" },
  { key: "name", label: "A–Z" },
  { key: "revenue", label: "Revenue" },
  { key: "orders", label: "Orders" },
];

export const HIGH_VALUE_THRESHOLD = 250_000;

export function matchesClientFilter(
  c: ClientRow, filter: ClientFilter, revenue: number, lastOrder: string | null,
): boolean {
  switch (filter) {
    case "all": return true;
    case "recent": {
      const d = daysSince(lastOrder);
      return d !== null && d <= 30;
    }
    case "high_value": return revenue >= HIGH_VALUE_THRESHOLD;
    default: return c.status === filter;
  }
}

/** Clients that need a follow-up: no orders in 60 days, or suspended/inactive with balance. */
export function needsFollowUp(c: ClientRow, lastOrder: string | null): string | null {
  if (c.status === "suspended") return "Account suspended";
  if (Number(c.outstanding_balance ?? 0) > 0) return "Outstanding balance";
  const d = daysSince(lastOrder ?? c.customer_since);
  if (d !== null && d >= 60) return `No orders in ${d} days`;
  if (!lastOrder) return "No orders placed yet";
  return null;
}

export function paymentTermsLabel(v: string | null | undefined): string {
  return PAYMENT_TERMS.find((t) => t.value === v)?.label ?? "—";
}
