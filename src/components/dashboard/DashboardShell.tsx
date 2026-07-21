import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Truck, LogOut, Bell, Home, DollarSign, Users, FileText, Settings,
  MapPin, Building2, ShieldAlert, Package, Route as RouteIcon, CreditCard, BarChart3,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";

type NavItem = { to: string; label: string; icon: any };

const NAV: Record<AppRole, NavItem[]> = {
  client: [
    { to: "/dashboard/client", label: "Home",     icon: Home },
    { to: "/dashboard/orders", label: "Orders",   icon: Package },
    { to: "/book",             label: "Book",     icon: MapPin },
    { to: "/dashboard/client", label: "Payments", icon: CreditCard },
    { to: "/dashboard/client", label: "Profile",  icon: Settings },
  ],
  driver: [
    { to: "/dashboard/driver", label: "Home",     icon: Home },
    { to: "/dashboard/orders", label: "Trips",    icon: Package },
    { to: "/dashboard/driver", label: "Map",      icon: MapPin },
    { to: "/dashboard/driver", label: "History",  icon: BarChart3 },
    { to: "/dashboard/driver", label: "Profile",  icon: Settings },
  ],
  fleet: [
    { to: "/dashboard/fleet",          label: "Home",    icon: Home },
    { to: "/dashboard/orders",         label: "Orders",  icon: Package },
    { to: "/dashboard/fleet/drivers",  label: "Drivers", icon: Users },
    { to: "/dashboard/fleet/earnings", label: "Reports", icon: DollarSign },
    { to: "/dashboard/fleet",          label: "Fleet",   icon: Building2 },
  ],
  dispatcher: [
    { to: "/dashboard/orders",         label: "Orders",  icon: Package },
    { to: "/dashboard/orders/new",     label: "New",     icon: RouteIcon },
    { to: "/dashboard/fleet/drivers",  label: "Drivers", icon: Users },
    { to: "/dashboard/fleet",          label: "Fleet",   icon: Building2 },
    { to: "/dashboard/client",         label: "Profile", icon: Settings },
  ],
  admin: [
    { to: "/dashboard/admin",  label: "Home",     icon: Home },
    { to: "/dashboard/orders", label: "Orders",   icon: Package },
    { to: "/dashboard/admin",  label: "Users",    icon: Users },
    { to: "/dashboard/admin",  label: "Docs",     icon: FileText },
    { to: "/dashboard/admin",  label: "Disputes", icon: ShieldAlert },
  ],
};

export function DashboardShell({ title, role, children }: { title: string; role: string; children: ReactNode }) {
  const { signOut, role: appRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = NAV[(appRole ?? "client") as AppRole];

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth/login" });
  }

  return (
    <main className="min-h-screen bg-secondary/40 pb-28">
      <header className="sticky top-0 z-40 px-3 pt-3">
        <div className="glass-strong rounded-2xl flex items-center gap-3 px-3 h-14">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center shadow-soft">
              <Truck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{role}</div>
            <div className="text-sm font-semibold truncate leading-tight">{title}</div>
          </div>
          <button className="tap grid place-items-center rounded-full hover:bg-secondary transition" title="Notifications">
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <button onClick={handleSignOut} className="tap grid place-items-center rounded-full hover:bg-secondary transition" title="Sign out">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      <div className="px-3 pt-3 max-w-3xl mx-auto">{children}</div>

      {/* Floating bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div
          className="pointer-events-auto max-w-3xl mx-auto glass-strong rounded-[28px] grid p-1.5 shadow-float"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((it, i) => {
            const active = location.pathname === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={`${it.label}-${i}`}
                to={it.to}
                className={`relative flex flex-col items-center justify-center gap-1 h-14 rounded-[22px] text-[10.5px] font-medium transition-colors ${
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 bg-primary rounded-[22px] shadow-soft"
                    transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  />
                )}
                <motion.span
                  animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="relative z-10"
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.4 : 2} />
                </motion.span>
                <span className="relative z-10 leading-none">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export function StatCard({
  label, value, sub, tone = "default",
}: { label: string; value: string; sub?: string; tone?: "default" | "success" | "warning" | "info" | "urgent" }) {
  const toneCls =
    tone === "success" ? "status-success" :
    tone === "warning" ? "status-warning" :
    tone === "info"    ? "status-info" :
    tone === "urgent"  ? "status-urgent" : "";
  return (
    <div className="card-elevated p-4">
      <div className={`inline-flex text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full ${toneCls || "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="font-display text-2xl font-bold mt-2 leading-none">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
