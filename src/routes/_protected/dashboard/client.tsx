import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Plus, MapPin, Package, ArrowRight, Truck, Sparkles, FileText, LayoutGrid,
} from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { ModuleGrid } from "@/components/dashboard/ModuleGrid";
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
    { to: "/book", label: "Book", icon: MapPin, primary: true },
    { to: "/dashboard/orders", label: "Track", icon: Truck },
    { to: "/onboarding/documents", label: "Documents", icon: FileText },
    { to: "/dashboard/more", label: "More", icon: LayoutGrid },
  ];

  return (
    <DashboardShell title={`${greeting()}, ${name}`} role="Client">
      {/* Hero — premium emerald card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Link to="/book" className="block card-premium p-5 mb-4 relative overflow-hidden press">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
          <div className="absolute right-4 top-4 flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-primary-foreground/70">
            <Sparkles className="h-3 w-3" /> On-demand
          </div>
          <div className="text-primary-foreground/70 text-xs font-medium mt-3">Where to today?</div>
          <div className="font-display text-2xl font-bold leading-tight mt-1 text-primary-foreground">
            Book a low loader
          </div>
          <div className="text-primary-foreground/70 text-sm mt-1">Verified operators, instant quote.</div>
          <div className="mt-5 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold px-4 h-11 text-sm font-semibold text-primary shadow-gold press">
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Start booking
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {quickActions.map((a, i) => (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i }}
          >
            <Link to={a.to} className="card-elevated p-3 flex flex-col items-center gap-2 press h-full">
              <div className={`h-11 w-11 rounded-2xl grid place-items-center ${
                a.primary ? "bg-primary text-primary-foreground shadow-soft" : "bg-primary-soft text-primary"
              }`}>
                <a.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div className="text-[11px] font-medium">{a.label}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Active" value="0" sub="trips" tone="info" to="/dashboard/orders" />
        <StatCard label="Month" value="KSh 0" sub="spent" />
        <StatCard label="Saved" value="0" sub="operators" tone="success" />
      </div>

      <ModuleGrid title="Explore" />


      {/* Recent trips */}
      <div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-display font-semibold">Recent trips</div>
          <Link to="/dashboard/orders" className="text-xs text-muted-foreground hover:text-foreground">See all</Link>
        </div>
        <div className="text-center py-8">
          <div className="h-14 w-14 rounded-3xl bg-primary-soft grid place-items-center mx-auto mb-3">
            <Package className="h-6 w-6 text-primary" strokeWidth={1.8} />
          </div>
          <div className="font-display font-semibold text-sm">No trips yet</div>
          <div className="text-xs text-muted-foreground mt-1">Your transport history will appear here.</div>
          <Link
            to="/book"
            className="inline-flex items-center gap-1.5 mt-4 rounded-full bg-primary text-primary-foreground px-4 h-9 text-xs font-semibold press"
          >
            <Plus className="h-3.5 w-3.5" /> Create first order
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
