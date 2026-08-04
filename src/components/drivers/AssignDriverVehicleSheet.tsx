import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Truck as TruckIcon, AlertTriangle, Check } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { VEHICLE_STATUS_META, vehicleTitle, type VehicleRow } from "@/lib/fleet-data";
import { driverAssignmentIssue, licenceValid, type DriverRow } from "@/lib/driver-data-model";

/** Assign or reassign a vehicle to a driver (driver-first flow). */
export function AssignDriverVehicleSheet({
  driver, open, onClose, onAssigned,
}: {
  driver: DriverRow | null;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const blocked = driver && (driver.status === "suspended" || !licenceValid(driver));

  useEffect(() => {
    if (!open || !driver) return;
    setLoading(true);
    supabase
      .from("trucks")
      .select("*")
      .eq("owner_id", driver.owner_id)
      .order("plate")
      .then(({ data }) => { setVehicles((data as VehicleRow[]) ?? []); setLoading(false); });
  }, [open, driver]);

  const assign = async (v: VehicleRow | null) => {
    if (!driver) return;
    if (v && blocked) {
      toast.error(
        driver.status === "suspended"
          ? `${driver.full_name} is suspended and cannot take a vehicle.`
          : `${driver.full_name}'s licence has expired.`,
      );
      return;
    }
    setBusy(v?.id ?? "clear");

    // Release any vehicle currently held by this driver, then attach the new one.
    if (driver.assigned_truck_id && driver.assigned_truck_id !== v?.id) {
      await supabase.from("trucks").update({ driver_id: null }).eq("id", driver.assigned_truck_id);
    }
    const { error } = await supabase
      .from("drivers")
      .update({ assigned_truck_id: v?.id ?? null })
      .eq("id", driver.id);
    if (!error && v) {
      await supabase.from("trucks").update({ driver_id: driver.user_id }).eq("id", v.id);
    }

    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(v ? `${v.plate} assigned to ${driver.full_name}` : `Vehicle released from ${driver.full_name}`);
    onAssigned();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={driver ? `Vehicle · ${driver.full_name}` : "Assign vehicle"}>
      {driver && blocked && (
        <div className="flex items-start gap-2 rounded-2xl status-urgent p-3 text-xs mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            {driver.status === "suspended"
              ? "Suspended drivers cannot be given a vehicle. Change the status first."
              : "This driver's licence has expired. Renew the licence before assigning a vehicle."}
          </div>
        </div>
      )}
      {driver && !blocked && driverAssignmentIssue(driver) && (
        <div className="flex items-start gap-2 rounded-2xl status-warning p-3 text-xs mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>{driverAssignmentIssue(driver)} You can still pair a vehicle for future dispatch.</div>
        </div>
      )}

      {loading ? (
        <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : vehicles.length === 0 ? (
        <EmptyState icon={TruckIcon} title="No vehicles yet" description="Add a vehicle to your fleet first." />
      ) : (
        <div className="space-y-2 pb-2">
          {driver?.assigned_truck_id && (
            <button
              onClick={() => assign(null)}
              disabled={busy !== null}
              className="w-full text-left rounded-2xl border border-border bg-secondary/40 p-3 text-sm press"
            >
              Release current vehicle
            </button>
          )}
          {vehicles.map((v) => {
            const active = driver?.assigned_truck_id === v.id;
            const taken = !!v.driver_id && v.driver_id !== driver?.user_id;
            return (
              <button
                key={v.id}
                onClick={() => assign(v)}
                disabled={busy !== null || !!blocked}
                className={`w-full text-left rounded-2xl border p-3 press transition disabled:opacity-45 ${
                  active ? "border-primary bg-primary-soft" : "border-border bg-secondary/50 hover:bg-secondary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{v.plate} · {vehicleTitle(v)}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {Number(v.capacity_tons)}T · {VEHICLE_STATUS_META[v.status].label}
                      {taken ? " · currently paired with another driver" : ""}
                    </div>
                  </div>
                  {active && <Check className="h-4 w-4 text-primary" />}
                  {busy === v.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
