import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LogOut, Bell, Home, Package, MapPin, User, Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";

type NavItem = { to: string; label: string; icon: any };

/**
 * Unified premium bottom navigation.
 * 5 tabs mapped role-aware, but each role sees the same visual shape.
 * Dashboard / Orders / Fleet / Tracking / Profile
 */
function navFor(role: AppRole): NavItem[] {
  const home: Record<AppRole, string> = {
    client: "/dashboard/client",
    driver: "/dashboard/driver",
    fleet: "/dashboard/fleet",
    dispatcher: "/dashboard/orders",
    admin: "/dashboard/admin",
  };
  const fleet: Record<AppRole, string> = {
    client: "/book",
    driver: "/dashboard/driver",
    fleet: "/dashboard/fleet/drivers",
    dispatcher: "/dashboard/fleet/drivers",
    admin: "/dashboard/admin",
  };
  const tracking: Record<AppRole, string> = {
    client: "/book",
    driver: "/dashboard/driver",
    fleet: "/dashboard/fleet",
    dispatcher: "/dashboard/orders",
    admin: "/dashboard/orders",
  };
  const profile: Record<AppRole, string> = {
    client: "/dashboard/client",
    driver: "/dashboard/driver",
    fleet: "/dashboard/fleet",
    dispatcher: "/dashboard/client",
    admin: "/dashboard/admin",
  };
  return [
    { to: home[role],     label: "Home",     icon: Home },
    { to: "/dashboard/orders", label: "Orders", icon: Package },
    { to: fleet[role],    label: "Fleet",    icon: Truck },
    { to: tracking[role], label: "Tracking", icon: MapPin },
    { to: profile[role],  label: "Profile",  icon: User },
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
    <main className="min-h-screen bg-background pb-28">
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
        className="fixed bottom-0 inset-x-0 z-40 px-4 pointer-events-none"
        style={{ paddingBottom: "max(0.85rem, env(safe-area-inset-bottom))" }}
      >
        <div className="pointer-events-auto max-w-md mx-auto glass-strong rounded-full grid grid-cols-5 p-1.5 shadow-float">
          {items.map((it, i) => {
            const active = location.pathname === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={`${it.label}-${i}`}
                to={it.to}
                className={`relative flex flex-col items-center justify-center h-12 rounded-full transition-colors ${
                  active ? "text-primary-foreground" : "text-muted-foreground"
                }`}
                aria-label={it.label}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 bg-primary rounded-full shadow-soft"
                    transition={{ type: "spring", stiffness: 500, damping: 34 }}
                  />
                )}
                <motion.div
                  animate={{ scale: active ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                  className="relative z-10 flex flex-col items-center gap-0.5"
                >
                  <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 2} />
                  <span
                    className={`text-[9.5px] font-medium leading-none tracking-wide transition-opacity ${
                      active ? "opacity-100" : "opacity-0 h-0"
                    }`}
                  >
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
  label, value, sub, tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "info" | "urgent";
}) {
  const toneCls =
    tone === "success" ? "status-success" :
    tone === "warning" ? "status-warning" :
    tone === "info"    ? "status-info" :
    tone === "urgent"  ? "status-urgent" : "";
  return (
    <div className="card-elevated p-4">
      <div className={`inline-flex text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full ${toneCls || "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="font-display text-2xl font-bold mt-2 leading-none tracking-tight">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
