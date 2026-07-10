import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Plus, MapPin, Package, CreditCard, Headphones, ArrowRight, Truck, Clock } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/client")({ component: ClientDashboard });

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function ClientDashboard() {
  const { user } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

  const quickActions = [
    { to: "/book",             label: "Book",     icon: MapPin,     tone: "bg-primary text-primary-foreground" },
    { to: "/dashboard/client", label: "Track",    icon: Truck,      tone: "bg-secondary text-foreground" },
    { to: "/dashboard/client", label: "Payments", icon: CreditCard, tone: "bg-secondary text-foreground" },
    { to: "/dashboard/client", label: "Support",  icon: Headphones, tone: "bg-secondary text-foreground" },
  ];

  return (
    <DashboardShell title={`${greeting()}, ${name}`} role="Client">
      {/* Hero CTA */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/book" className="block card-elevated p-5 mb-3 group">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary grid place-items-center shadow-soft group-active:scale-95 transition">
              <Plus className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg font-bold leading-tight">Where to today?</div>
              <div className="text-xs text-muted-foreground mt-0.5">Book a verified low loader in seconds.</div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition" />
          </div>
        </Link>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {quickActions.map((a) => (
          <Link key={a.label} to={a.to} className="card-elevated p-3 flex flex-col items-center gap-2 active:scale-95 transition">
            <div className={`h-11 w-11 rounded-2xl grid place-items-center ${a.tone}`}>
              <a.icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="text-[11px] font-medium">{a.label}</div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Active" value="0" sub="trips" tone="info" />
        <StatCard label="Month" value="KSh 0" sub="spent" />
        <StatCard label="Saved" value="0" sub="operators" tone="success" />
      </div>

      {/* Recent trips */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Recent trips</div>
          <Link to="/dashboard/client" className="text-xs text-muted-foreground hover:text-foreground">See all</Link>
        </div>
        <div className="text-center py-10 text-sm text-muted-foreground">
          <div className="h-12 w-12 rounded-2xl bg-secondary grid place-items-center mx-auto mb-3">
            <Package className="h-5 w-5" />
          </div>
          <div className="font-medium text-foreground">No trips yet</div>
          <div className="text-xs mt-1">Your transport history will show up here.</div>
        </div>
      </div>

      {/* Tips card */}
      <div className="card-elevated p-4 mt-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl status-info grid place-items-center">
          <Clock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Faster pickups</div>
          <div className="text-xs text-muted-foreground">Add machinery details up front for instant matches.</div>
        </div>
        <Link to="/book" className="text-xs font-semibold text-primary">Book</Link>
      </div>
    </DashboardShell>
  );
}
