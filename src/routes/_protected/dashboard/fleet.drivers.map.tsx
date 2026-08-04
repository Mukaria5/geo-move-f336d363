import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Phone, Truck as TruckIcon, X, ChevronRight, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DriverLiveMap } from "@/components/drivers/DriverLiveMap";
import { DriverAvatar, DriverStatusChip } from "@/components/drivers/DriverCard";
import { DriverStatusSheet } from "@/components/drivers/DriverStatusSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  DRIVER_FILTERS, matchesDriverFilter, type DriverFilter, type DriverRow,
} from "@/lib/driver-data-model";

export const Route = createFileRoute("/_protected/dashboard/fleet/drivers/map")({
  component: DriverMapPage,
});

function DriverMapPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DriverFilter>("all");
  const [selected, setSelected] = useState<DriverRow | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("drivers").select("*").eq("owner_id", user.id);
    setDrivers((data as DriverRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("drivers-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const visible = useMemo(
    () => drivers.filter((d) => matchesDriverFilter(d.status, filter)),
    [drivers, filter],
  );
  const located = visible.filter((d) => d.current_lat != null && d.current_lng != null);

  return (
    <DashboardShell title="Driver map" role="Fleet">
      <div className="relative -mx-4 -mt-2">
        <div className="h-[62vh] overflow-hidden">
          <DriverLiveMap
            className="h-full w-full"
            drivers={located}
            selectedId={selected?.id ?? null}
            onSelect={(id) => setSelected(drivers.find((d) => d.id === id) ?? null)}
          />
        </div>

        <div className="absolute top-3 left-3 right-3 z-[500] flex gap-1.5 overflow-x-auto pb-1">
          {DRIVER_FILTERS.map((f) => (
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

        {loading && (
          <div className="absolute inset-0 grid place-items-center z-[400]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ y: 140, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 140, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="absolute left-3 right-3 bottom-3 z-[500] card-premium p-3"
            >
              <div className="flex gap-3">
                <DriverAvatar driver={selected} size={52} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display font-semibold truncate flex-1">{selected.full_name}</div>
                    <DriverStatusChip status={selected.status} />
                    <button onClick={() => setSelected(null)} className="text-muted-foreground press" aria-label="Close">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {selected.phone ?? "No phone"} · {selected.licence_class ? `Class ${selected.licence_class}` : "No class"}
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    {selected.phone && (
                      <a
                        href={`tel:${selected.phone}`}
                        className="flex-1 h-10 rounded-2xl bg-secondary grid place-items-center press"
                        aria-label="Call driver"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => setStatusOpen(true)}
                      className="flex-1 h-10 rounded-2xl bg-gold text-primary grid place-items-center press"
                      aria-label="Change status"
                    >
                      <TruckIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate({ to: "/dashboard/fleet/drivers/$driverId", params: { driverId: selected.id } })}
                      className="flex-[2] h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 press"
                    >
                      Open profile <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!loading && located.length === 0 && (
        <EmptyState
          icon={Users}
          title="No live positions"
          description="Drivers appear here once their app shares a location."
        />
      )}

      <DriverStatusSheet
        driver={selected}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onChanged={load}
      />
    </DashboardShell>
  );
}
