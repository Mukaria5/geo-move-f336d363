import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Truck, LogOut, Bell, Home, Briefcase, DollarSign, Users, FileText, Settings, MapPin, Building2, ShieldAlert, Package } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth, type AppRole } from "@/lib/auth-context";

type NavItem = { to: string; label: string; icon: any };

const NAV: Record<AppRole, NavItem[]> = {
  client: [
    { to: "/dashboard/client", label: "Home", icon: Home },
    { to: "/book", label: "Book", icon: MapPin },
    { to: "/dashboard/client", label: "Trips", icon: Package },
    { to: "/dashboard/client", label: "Profile", icon: Settings },
  ],
  driver: [
    { to: "/dashboard/driver", label: "Home", icon: Home },
    { to: "/dashboard/driver", label: "Trips", icon: Briefcase },
    { to: "/dashboard/driver", label: "Map", icon: MapPin },
    { to: "/dashboard/driver", label: "Earnings", icon: DollarSign },
    { to: "/dashboard/driver", label: "Profile", icon: Settings },
  ],
  fleet: [
    { to: "/dashboard/fleet", label: "Dashboard", icon: Home },
    { to: "/dashboard/fleet", label: "Fleet", icon: Building2 },
    { to: "/dashboard/fleet/drivers", label: "Drivers", icon: Users },
    { to: "/dashboard/fleet/earnings", label: "Reports", icon: DollarSign },
    { to: "/dashboard/fleet", label: "Profile", icon: Settings },
  ],
  admin: [
    { to: "/dashboard/admin", label: "Home", icon: Home },
    { to: "/dashboard/admin", label: "Users", icon: Users },
    { to: "/dashboard/admin", label: "Docs", icon: FileText },
    { to: "/dashboard/admin", label: "Disputes", icon: ShieldAlert },
    { to: "/dashboard/admin", label: "Profile", icon: Settings },
  ],
};

export function DashboardShell({ title, role, children }: { title: string; role: string; children: ReactNode }) {
  const { signOut, user, role: appRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = NAV[(appRole ?? "client") as AppRole];

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth/login" });
  }

  return (
    <main className="min-h-screen pb-24 sm:pb-8">
      <header className="sticky top-0 z-40 px-3 sm:px-4 pt-3">
        <div className="glass-strong rounded-2xl flex items-center gap-3 p-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center">
              <Truck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg hidden sm:block">
              Load<span className="text-gradient-safety">Link</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {items.map((it, i) => {
              const active = location.pathname === it.to;
              return (
                <Link
                  key={`${it.label}-${i}`}
                  to={it.to}
                  className={`px-3 h-9 inline-flex items-center gap-1.5 rounded-lg text-sm transition ${
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex-1 min-w-0 text-right md:text-left md:ml-2">
            <div className="text-[10px] font-mono text-primary tracking-widest uppercase">{role}</div>
            <div className="text-sm font-semibold truncate">{title}</div>
          </div>
          <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5" title="Notifications">
            <Bell className="h-4 w-4" />
          </button>
          <button onClick={handleSignOut} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="p-3 sm:p-4 max-w-6xl mx-auto">{children}</div>
      {user && <div className="text-[10px] text-muted-foreground text-center pb-6 font-mono">{user.email}</div>}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className={`glass-strong rounded-2xl grid p-1`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((it, i) => {
            const active = location.pathname === it.to;
            return (
              <Link
                key={`${it.label}-${i}`}
                to={it.to}
                className={`relative flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl text-[10px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 bg-primary/15 rounded-xl"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <it.icon className="h-4 w-4 relative z-10" />
                <span className="relative z-10">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
