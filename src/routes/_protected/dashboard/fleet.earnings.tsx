import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, Loader2, TrendingUp, CheckCircle2 } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/fleet/earnings")({
  component: FleetEarnings,
});

type BookingRow = {
  id: string;
  status: string;
  final_price: number | null;
  estimated_price: number | null;
  distance_km: number | null;
  created_at: string;
  truck_id: string | null;
  pickup_address: string;
  dropoff_address: string;
};

function FleetEarnings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: trucks } = await supabase
        .from("trucks")
        .select("id")
        .eq("owner_id", user.id);
      const truckIds = (trucks ?? []).map((t: any) => t.id);
      if (truckIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: bookings } = await supabase
        .from("bookings")
        .select(
          "id, status, final_price, estimated_price, distance_km, created_at, truck_id, pickup_address, dropoff_address"
        )
        .in("truck_id", truckIds)
        .order("created_at", { ascending: false });
      setRows((bookings as BookingRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const completed = rows.filter((r) => r.status === "completed");
    const total = completed.reduce(
      (s, r) => s + Number(r.final_price ?? r.estimated_price ?? 0),
      0
    );
    const now = new Date();
    const monthTotal = completed
      .filter((r) => {
        const d = new Date(r.created_at);
        return (
          d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        );
      })
      .reduce((s, r) => s + Number(r.final_price ?? r.estimated_price ?? 0), 0);
    return { total, monthTotal, tripCount: completed.length };
  }, [rows]);

  return (
    <DashboardShell title="Earnings" role="Fleet">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <StatCard
          label="This month"
          value={`KSh ${stats.monthTotal.toLocaleString()}`}
        />
        <StatCard
          label="All time"
          value={`KSh ${stats.total.toLocaleString()}`}
        />
        <StatCard label="Completed trips" value={String(stats.tripCount)} />
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Recent bookings
          </div>
        </div>

        {loading ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <DollarSign className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No bookings yet. Earnings will appear here after your trucks complete
            trips.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((b) => {
              const amount = Number(b.final_price ?? b.estimated_price ?? 0);
              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-border bg-white/5 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center">
                      {b.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {b.pickup_address} → {b.dropoff_address}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {new Date(b.created_at).toLocaleDateString()} ·{" "}
                        {b.distance_km ? `${b.distance_km} km · ` : ""}
                        <span className="capitalize">{b.status}</span>
                      </div>
                    </div>
                    <div className="text-sm font-mono font-semibold shrink-0">
                      KSh {amount.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
