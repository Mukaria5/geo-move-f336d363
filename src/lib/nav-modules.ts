import {
  Package, Truck, Users, Building2, Wallet, Receipt, Fuel, Map as MapIcon,
  ShieldCheck, User, FileText, TrendingUp, Plus, Navigation, CreditCard, Radar, LayoutList,
  BarChart3,
} from "lucide-react";
import type { AppRole } from "@/lib/auth-context";

export type ModuleLink = {
  to: string;
  label: string;
  desc: string;
  icon: any;
};

export type ModuleGroup = { group: string; items: ModuleLink[] };

const OPERATIONS: ModuleLink[] = [
  { to: "/dashboard/tracking", label: "Dispatch center", desc: "Live map of every delivery", icon: Radar },
  { to: "/dashboard/tracking/board", label: "Dispatch board", desc: "Assign drivers & vehicles", icon: LayoutList },
  { to: "/dashboard/orders", label: "Orders", desc: "Dispatch & track every job", icon: Package },
  { to: "/dashboard/orders/new", label: "New order", desc: "Create a transport order", icon: Plus },
  { to: "/dashboard/fleet", label: "Fleet", desc: "Vehicles, service & compliance", icon: Truck },
  { to: "/dashboard/fleet/map", label: "Fleet map", desc: "Live vehicle positions", icon: MapIcon },
  { to: "/dashboard/fleet/new", label: "Add vehicle", desc: "Register a new truck", icon: Plus },
  { to: "/dashboard/fleet/drivers", label: "Drivers", desc: "Roster, licences & scores", icon: Users },
  { to: "/dashboard/fleet/drivers/map", label: "Driver map", desc: "Live driver locations", icon: Navigation },
  { to: "/dashboard/fleet/drivers/new", label: "Add driver", desc: "Onboard a driver", icon: Plus },
  { to: "/dashboard/fleet/clients", label: "Clients (CRM)", desc: "Accounts & relationships", icon: Building2 },
  { to: "/dashboard/fleet/clients/new", label: "Add client", desc: "Register a client account", icon: Plus },
];

const FINANCE: ModuleLink[] = [
  { to: "/dashboard/fleet/finance", label: "Finance", desc: "Revenue, profit & collection", icon: Wallet },
  { to: "/dashboard/fleet/invoices", label: "Invoices", desc: "Issue, track & export PDFs", icon: Receipt },
  { to: "/dashboard/fleet/invoices/new", label: "New invoice", desc: "Bill an order or client", icon: FileText },
  { to: "/dashboard/fleet/payments/new", label: "Record payment", desc: "Log a client payment", icon: CreditCard },
  { to: "/dashboard/fleet/expenses", label: "Expenses", desc: "Fuel, maintenance & allowances", icon: Fuel },
  { to: "/dashboard/fleet/earnings", label: "Earnings", desc: "Payout summary", icon: TrendingUp },
];

/** Reports & BI sections — kept in sync with ROLE_SECTIONS in ReportsUI.tsx. */
const REPORT_SECTIONS: { key: string; label: string; desc: string }[] = [
  { key: "overview", label: "Reports overview", desc: "KPIs, trends & exports", },
  { key: "revenue", label: "Revenue analytics", desc: "Paid, outstanding & by client" },
  { key: "orders", label: "Order analytics", desc: "Volume, status & delivery time" },
  { key: "fleet", label: "Fleet analytics", desc: "Utilisation & cost per vehicle" },
  { key: "drivers", label: "Driver analytics", desc: "Trips, distance & leaderboard" },
  { key: "clients", label: "Client analytics", desc: "Value, balance & activity" },
  { key: "expenses", label: "Expense analytics", desc: "Categories, trends & drivers" },
  { key: "profitability", label: "Profitability", desc: "Gross profit & margin per order" },
  { key: "fuel", label: "Fuel analytics", desc: "Cost, litres & efficiency" },
  { key: "delivery", label: "Delivery performance", desc: "On-time rate & delays" },
];

const REPORT_ACCESS: Record<string, string[]> = {
  admin: REPORT_SECTIONS.map((s) => s.key),
  fleet: REPORT_SECTIONS.map((s) => s.key),
  dispatcher: ["overview", "orders", "fleet", "drivers", "fuel", "delivery"],
  driver: ["overview", "orders", "delivery"],
  client: ["overview", "orders", "revenue", "delivery"],
};

const reportsFor = (role: AppRole): ModuleLink[] => {
  const allowed = REPORT_ACCESS[role] ?? REPORT_ACCESS.fleet;
  return REPORT_SECTIONS.filter((s) => allowed.includes(s.key)).map((s) => ({
    to: s.key === "overview" ? "/dashboard/reports" : `/dashboard/reports/${s.key}`,
    label: s.label,
    desc: s.desc,
    icon: BarChart3,
  }));
};

const ACCOUNT: ModuleLink[] = [
  { to: "/onboarding/profile", label: "Profile & settings", desc: "Your details and company info", icon: User },
  { to: "/onboarding/documents", label: "Documents", desc: "KYC and compliance uploads", icon: FileText },
];

export function modulesFor(role: AppRole): ModuleGroup[] {
  if (role === "client") {
    return [
      {
        group: "Transport",
        items: [
          { to: "/book", label: "Book a truck", desc: "Instant quote & booking", icon: Plus },
          { to: "/dashboard/orders", label: "My orders", desc: "Track live and past jobs", icon: Package },
          { to: "/dashboard/tracking", label: "Track shipment", desc: "Live map & delivery timeline", icon: Radar },
        ],
      },
      { group: "Reports", items: reportsFor(role) },
      { group: "Account", items: ACCOUNT },
    ];
  }
  if (role === "driver") {
    return [
      {
        group: "Driving",
        items: [
          { to: "/dashboard/driver", label: "Home", desc: "Go online & accept jobs", icon: Truck },
          { to: "/dashboard/orders", label: "My trips", desc: "Assigned and past trips", icon: Package },
          { to: "/dashboard/tracking", label: "Live trip", desc: "Navigation & status controls", icon: Radar },
          { to: "/dashboard/fleet/drivers/map", label: "Navigation", desc: "Live map view", icon: Navigation },
        ],
      },
      { group: "Reports", items: reportsFor(role) },
      { group: "Account", items: ACCOUNT },
    ];
  }
  if (role === "dispatcher") {
    return [
      { group: "Operations", items: OPERATIONS.filter((m) => !m.to.includes("clients")) },
      { group: "Reports", items: reportsFor(role) },
      { group: "Account", items: ACCOUNT },
    ];
  }
  if (role === "admin") {
    return [
      {
        group: "Administration",
        items: [
          { to: "/dashboard/admin", label: "Admin console", desc: "Verify trucks, companies & docs", icon: ShieldCheck },
        ],
      },
      { group: "Operations", items: OPERATIONS },
      { group: "Finance", items: FINANCE },
      { group: "Reports", items: reportsFor(role) },
      { group: "Account", items: ACCOUNT },
    ];
  }
  // fleet (company admin / manager)
  return [
    { group: "Operations", items: OPERATIONS },
    { group: "Finance", items: FINANCE },
    { group: "Reports", items: reportsFor(role) },
    { group: "Account", items: ACCOUNT },
  ];
}

/** Compact grid used on dashboards as module entry points. */
export function primaryModulesFor(role: AppRole): ModuleLink[] {
  const groups = modulesFor(role);
  const flat = groups.flatMap((g) => g.items);
  if (role === "client" || role === "driver") return flat.slice(0, 6);
  const wanted = [
    "/dashboard/orders",
    "/dashboard/fleet",
    "/dashboard/fleet/drivers",
    "/dashboard/fleet/clients",
    "/dashboard/fleet/finance",
    "/dashboard/reports",
  ];
  return wanted.map((w) => flat.find((m) => m.to === w)).filter(Boolean) as ModuleLink[];
}
