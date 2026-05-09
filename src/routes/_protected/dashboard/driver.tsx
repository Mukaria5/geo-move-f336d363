import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Power, TrendingUp, Truck, Star, ShieldCheck, Clock } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/driver")({ component: DriverDashboard });

function DriverDashboard() {
  const { user } = useAuth();
  const [online, setOnline] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("driver_profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setProfile(data); setOnline(data?.is_online ?? false); });
  }, [user]);

  async function toggle() {
    if (!user) return;
    const next = !online;
    setOnline(next);
    await supabase.from("driver_profiles").update({ is_online: next }).eq("user_id", user.id);
  }

  return (
    <DashboardShell title="Driver dashboard" role="Operator">
      <button
        onClick={toggle}
        className={`w-full glass-strong rounded-2xl p-5 mb-4 flex items-center gap-4 border transition-all ${
          online ? "border-primary bg-primary/10" : "border-border"
        }`}
      >
        <div className={`relative h-12 w-12 rounded-full grid place-items-center ${online ? "bg-primary" : "bg-white/10"}`}>
          <Power className={`h-5 w-5 ${online ? "text-primary-foreground" : ""}`} strokeWidth={2.5} />
          {online && <div className="absolute inset-0 rounded-full pulse-ring opacity-50" />}
        </div>
        <div className="flex-1 text-left">
          <div className="font-display text-lg font-bold">{online ? "You're online" : "You're offline"}</div>
          <div className="text-xs text-muted-foreground">{online ? "Receiving nearby transport requests." : "Tap to start receiving jobs."}</div>
        </div>
        <div className={`text-xs font-mono px-2 py-1 rounded ${online ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground"}`}>
          {online ? "LIVE" : "OFF"}
        </div>
      </button>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard label="Today" value="KSh 0" sub="earned" />
        <StatCard label="This week" value="KSh 0" sub="earned" />
        <StatCard label="Trips" value="0" sub="completed" />
        <StatCard label="Rating" value="—" sub="from clients" />
      </div>

      <div className="glass rounded-2xl p-4 mb-4">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Your truck</div>
        {profile ? (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center text-2xl">🚛</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{profile.vehicle_make} {profile.vehicle_model}</div>
              <div className="text-xs text-muted-foreground">{profile.plate} · {profile.capacity_tons}T</div>
            </div>
            <div className={`text-[10px] font-mono px-2 py-1 rounded inline-flex items-center gap-1 ${
              profile.verified ? "bg-primary/15 text-primary" : "bg-white/10 text-muted-foreground"
            }`}>
              <ShieldCheck className="h-3 w-3" /> {profile.verified ? "VERIFIED" : "PENDING"}
            </div>
          </div>
        ) : <div className="text-sm text-muted-foreground">Loading…</div>}
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Job history</div>
        <div className="text-center py-10 text-sm text-muted-foreground">
          <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
          No completed trips yet. Go online to receive requests.
        </div>
      </div>
    </DashboardShell>
  );
}
