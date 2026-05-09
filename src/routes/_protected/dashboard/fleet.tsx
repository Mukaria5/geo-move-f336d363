import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Truck, Users, TrendingUp, Plus } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/fleet")({ component: FleetDashboard });

function FleetDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("fleet_companies").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setCompany(data));
  }, [user]);

  return (
    <DashboardShell title={company?.company_name ?? "Fleet dashboard"} role="Fleet">
      <div className="glass-strong rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg font-bold">{company?.company_name ?? "Your fleet"}</div>
            <div className="text-xs text-muted-foreground">{company?.fleet_size ?? 0} trucks · {company?.verified ? "Verified" : "Pending verification"}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard label="Trucks" value={String(company?.fleet_size ?? 0)} />
        <StatCard label="Active" value="0" sub="on jobs" />
        <StatCard label="Drivers" value="0" />
        <StatCard label="Revenue" value="KSh 0" sub="this month" />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Trucks</div>
            <button className="text-xs font-medium text-primary inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Add</button>
          </div>
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Truck className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No trucks added yet.
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Drivers</div>
            <button className="text-xs font-medium text-primary inline-flex items-center gap-1"><Plus className="h-3 w-3" /> Invite</button>
          </div>
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No drivers yet.
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
