import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Loader2, Truck, Phone } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/fleet/drivers")({
  component: FleetDrivers,
});

type DriverInfo = {
  driver_id: string;
  full_name: string | null;
  phone: string | null;
  trucks: { id: string; truck_model: string; plate: string; is_online: boolean }[];
};

function FleetDrivers() {
  const { user } = useAuth();
  const [rows, setRows] = useState<DriverInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: trucks } = await supabase
        .from("trucks")
        .select("id, truck_model, plate, is_online, driver_id")
        .eq("owner_id", user.id);

      const driverIds = Array.from(
        new Set((trucks ?? []).map((t: any) => t.driver_id).filter(Boolean))
      ) as string[];

      let profiles: any[] = [];
      if (driverIds.length) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", driverIds);
        profiles = data ?? [];
      }

      const grouped: DriverInfo[] = driverIds.map((id) => {
        const p = profiles.find((x) => x.id === id);
        return {
          driver_id: id,
          full_name: p?.full_name ?? null,
          phone: p?.phone ?? null,
          trucks: (trucks ?? [])
            .filter((t: any) => t.driver_id === id)
            .map((t: any) => ({
              id: t.id,
              truck_model: t.truck_model,
              plate: t.plate,
              is_online: t.is_online,
            })),
        };
      });

      setRows(grouped);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardShell title="Drivers" role="Fleet">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            My drivers
          </div>
          <div className="text-xs text-muted-foreground">{rows.length} total</div>
        </div>

        {loading ? (
          <div className="py-10 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No drivers assigned yet. Assign a driver when adding a truck.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((d) => (
              <div
                key={d.driver_id}
                className="rounded-xl border border-border bg-white/5 p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">
                      {d.full_name ?? "Unnamed driver"}
                    </div>
                    {d.phone && (
                      <div className="text-xs text-muted-foreground font-mono inline-flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {d.phone}
                      </div>
                    )}
                    <div className="mt-2 space-y-1">
                      {d.trucks.map((t) => (
                        <div
                          key={t.id}
                          className="text-xs inline-flex items-center gap-1.5 mr-2"
                        >
                          <Truck className="h-3 w-3 text-primary" />
                          <span className="font-medium">{t.truck_model}</span>
                          <span className="font-mono text-muted-foreground">
                            {t.plate}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              t.is_online
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {t.is_online ? "online" : "offline"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
