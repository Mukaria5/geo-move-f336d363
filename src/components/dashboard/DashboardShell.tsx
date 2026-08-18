import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LogOut, Bell, Home, Package, MapPin, Truck, Users, LayoutGrid, Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";

type NavItem = { to: string; label: string; icon: any };

/**
 * Unified premium bottom navigation.
 * 5 role-aware tabs, with a "More" tab that opens the full module hub
 * so no completed module is ever unreachable.
 */
function navFor(role: AppRole): NavItem[] {
  const more: NavItem = { to: "/dashboard/more", label: "More", icon: LayoutGrid };

  if (role === "client") {
    return [
      { to: "/dashboard/client", label: "Home", icon: Home },
      { to: "/book", label: "Book", icon: MapPin },
      { to: "/dashboard/orders", label: "Orders", icon: Package },
      { to: "/onboarding/profile", label: "Profile", icon: Users },
      more,
    ];
  }
  if (role === "driver") {
    return [
      { to: "/dashboard/driver", label: "Home", icon: Home },
      { to: "/dashboard/orders", label: "Trips", icon: Package },
      { to: "/dashboard/fleet/drivers/map", label: "Map", icon: MapPin },
      { to: "/onboarding/profile", label: "Profile", icon: Users },
      more,
    ];
  }
  if (role === "admin") {
    return [
      { to: "/dashboard/admin", label: "Home", icon: Home },
      { to: "/dashboard/orders", label: "Orders", icon: Package },
      { to: "/dashboard/fleet", label: "Fleet", icon: Truck },
      { to: "/dashboard/fleet/finance", label: "Finance", icon: Wallet },
      more,
    ];
  }
  if (role === "dispatcher") {
    return [
      { to: "/dashboard/orders", label: "Orders", icon: Home },
      { to: "/dashboard/fleet", label: "Fleet", icon: Truck },
      { to: "/dashboard/fleet/drivers", label: "Drivers", icon: Users },
      { to: "/dashboard/fleet/map", label: "Map", icon: MapPin },
      more,
    ];
  }
  // fleet owner / manager
  return [
    { to: "/dashboard/fleet", label: "Home", icon: Home },
    { to: "/dashboard/orders", label: "Orders", icon: Package },
    { to: "/dashboard/fleet/drivers", label: "Drivers", icon: Users },
    { to: "/dashboard/fleet/finance", label: "Finance", icon: Wallet },
    more,
  ];
}


export function DashboardShell({
  title, role, children, hero,
}: {
  title: string;
  role: string;
  children: ReactNode;
  /** Optional hero section rendered flush under the header for map-forward screens. */
  hero?: ReactNode;
}) {
  const { signOut, role: appRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = navFor((appRole ?? "client") as AppRole);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth/login" });
  }

  return (
    <main
      className="min-h-screen bg-background"
      style={{ paddingBottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 px-4 pt-3 safe-top">
        <div className="glass-strong rounded-[22px] flex items-center gap-3 px-3 h-14">
          <Link to="/" className="flex items-center gap-2 shrink-0 press">
            <div className="h-9 w-9 rounded-2xl bg-primary grid place-items-center shadow-soft">
              <Truck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">{role}</div>
            <div className="text-[15px] font-display font-semibold truncate leading-tight">{title}</div>
          </div>
          <button className="tap grid place-items-center rounded-full hover:bg-secondary press" title="Notifications">
            <Bell className="h-[18px] w-[18px]" />
          </button>
          <button onClick={handleSignOut} className="tap grid place-items-center rounded-full hover:bg-secondary press" title="Sign out">
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </header>

      {hero && <div className="px-4 pt-3 max-w-3xl mx-auto">{hero}</div>}
      <div className="px-4 pt-3 max-w-3xl mx-auto">{children}</div>

      {/* Premium floating bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 px-2 sm:px-4 pointer-events-none"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        aria-label="Primary"
      >
        <div
          className="pointer-events-auto w-full max-w-md mx-auto glass-strong rounded-[28px] grid gap-0.5 p-1.5 shadow-float"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((it, i) => {
            const active =
              location.pathname === it.to ||
              (it.to !== "/" && location.pathname.startsWith(it.to + "/"));
            const Icon = it.icon;
            return (
              <Link
                key={`${it.label}-${i}`}
                to={it.to}
                className={`relative flex min-w-0 flex-col items-center justify-center h-14 rounded-[22px] px-0.5 transition-colors ${
                  active ? "text-primary-foreground" : "text-foreground/70"
                }`}
                aria-label={it.label}
                aria-current={active ? "page" : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 bg-primary rounded-[22px] shadow-soft"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                <motion.div
                  animate={{ scale: active ? 1.04 : 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  className="relative z-10 flex min-w-0 w-full flex-col items-center gap-1"
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
                  <span className="w-full truncate text-center text-[10px] font-semibold leading-none tracking-tight">
                    {it.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export function StatCard({
  label, value, sub, tone = "default", to,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "info" | "urgent";
  /** Optional destination — makes the stat a tappable entry point into its module. */
  to?: string;
}) {
  const toneCls =
    tone === "success" ? "status-success" :
    tone === "warning" ? "status-warning" :
    tone === "info"    ? "status-info" :
    tone === "urgent"  ? "status-urgent" : "";
  const body = (
    <>
      <div className={`inline-flex text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full ${toneCls || "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="font-display text-2xl font-bold mt-2 leading-none tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </>
  );
  if (to) {
    return <Link to={to} className="card-elevated p-4 block press">{body}</Link>;
  }
  return <div className="card-elevated p-4">{body}</div>;
}
