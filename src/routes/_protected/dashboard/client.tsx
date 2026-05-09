import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, MapPin, Clock, Star } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/client")({ component: ClientDashboard });

function ClientDashboard() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || "there";
  return (
    <DashboardShell title={`Hi, ${name.split(" ")[0]}`} role="Client">
      <Link to="/book" className="block glass-strong rounded-2xl p-5 mb-4 group hover:border-primary/40 transition">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary grid place-items-center glow-safety">
            <Plus className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg font-bold">Book a low loader</div>
            <div className="text-xs text-muted-foreground">Get instant quotes from verified operators near you.</div>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard label="Active" value="0" sub="trips" />
        <StatCard label="This month" value="KSh 0" sub="spent" />
        <StatCard label="Saved" value="0" sub="operators" />
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Recent trips</div>
        <div className="text-center py-10 text-sm text-muted-foreground">
          <MapPin className="h-6 w-6 mx-auto mb-2 opacity-50" />
          No trips yet. Your transport history will appear here.
        </div>
      </div>
    </DashboardShell>
  );
}
