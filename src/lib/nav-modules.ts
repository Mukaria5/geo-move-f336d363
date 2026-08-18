import {
  Package, Truck, Users, Building2, Wallet, Receipt, Fuel, Map as MapIcon,
  ShieldCheck, User, FileText, TrendingUp, Plus, Navigation, CreditCard, Radar, LayoutList,
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
      { group: "Account", items: ACCOUNT },
    ];
  }
  if (role === "dispatcher") {
    return [
      { group: "Operations", items: OPERATIONS.filter((m) => !m.to.includes("clients")) },
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
      { group: "Account", items: ACCOUNT },
    ];
  }
  // fleet (company admin / manager)
  return [
    { group: "Operations", items: OPERATIONS },
    { group: "Finance", items: FINANCE },
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
    "/dashboard/fleet/invoices",
  ];
  return wanted.map((w) => flat.find((m) => m.to === w)).filter(Boolean) as ModuleLink[];
}

