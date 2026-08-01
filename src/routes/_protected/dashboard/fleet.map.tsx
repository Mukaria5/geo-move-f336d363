import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Truck as TruckIcon, X, ChevronRight, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LeafletMap } from "@/components/LeafletMap";
import { StatusChip } from "@/components/fleet/VehicleCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  FLEET_FILTERS, VEHICLE_STATUS_META, matchesFilter, vehicleTitle,
  type FleetFilter, type VehicleRow,
} from "@/lib/fleet-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/map")({ component: FleetMap });

function FleetMap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FleetFilter>("all");
  const [selected, setSelected] = useState<VehicleRow | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("trucks").select("*").eq("owner_id", user.id);
    setVehicles((data as VehicleRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  // Live location + status updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("fleet-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "trucks" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const visible = useMemo(() => vehicles.filter((v) => matchesFilter(v.status, filter)), [vehicles, filter]);
  const located = visible.filter((v) => v.current_lat != null && v.current_lng != null);

  const center = located.length
    ? { lat: located[0]!.current_lat!, lng: located[0]!.current_lng! }
    : undefined;

  return (
    <DashboardShell title="Fleet map" role="Fleet">
      <div className="relative -mx-4 -mt-2">
        <div className="h-[62vh] overflow-hidden">
          <LeafletMap
            className="h-full w-full"
            center={center}
            zoom={11}
            trucks={located as any}
            selectedTruckId={selected?.id ?? null}
            onTruckClick={(id) => setSelected(vehicles.find((v) => v.id === id) ?? null)}
          />
        </div>

        {/* Filters overlay */}
        <div className="absolute top-3 left-3 right-3 z-[500] flex gap-1.5 overflow-x-auto pb-1">
          {FLEET_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold shadow-soft press ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[500] rounded-2xl bg-card/95 backdrop-blur border border-border shadow-soft p-2.5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Status</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {(["available", "on_trip", "maintenance", "offline"] as const).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: VEHICLE_STATUS_META[s].marker }} />
                {VEHICLE_STATUS_META[s].label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle list under the map */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-display font-semibold">
            {loading ? "Loading vehicles…" : `${visible.length} vehicles`}
          </div>
          <div className="text-xs text-muted-foreground">{located.length} reporting location</div>
        </div>
        {loading ? (
          <div className="py-8 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {visible.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className="w-full text-left card-elevated p-3 flex items-center gap-3 press"
              >
                <div className="h-10 w-10 rounded-2xl bg-primary-soft grid place-items-center shrink-0">
                  <TruckIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm font-mono truncate">{v.plate}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{vehicleTitle(v)}</div>
                </div>
                <StatusChip status={v.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating detail card */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed inset-x-3 z-40 card-elevated p-4"
            style={{ bottom: "calc(5.6rem + env(safe-area-inset-bottom))" }}
          >
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-2xl bg-primary-soft grid place-items-center shrink-0">
                <TruckIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold flex items-center gap-2">
                  {selected.plate} <StatusChip status={selected.status} />
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{vehicleTitle(selected)}</div>
                <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 text-primary" />
                  {selected.current_lat != null && selected.current_lng != null
                    ? `${selected.current_lat.toFixed(4)}, ${selected.current_lng.toFixed(4)}`
                    : "No location reported"}
                  {selected.location_updated_at ? ` · ${new Date(selected.location_updated_at).toLocaleTimeString()}` : ""}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="h-8 w-8 grid place-items-center rounded-full bg-secondary press" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => navigate({ to: "/dashboard/fleet/vehicles/$vehicleId", params: { vehicleId: selected.id } })}
              className="mt-3 w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 press"
            >
              Open vehicle <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
