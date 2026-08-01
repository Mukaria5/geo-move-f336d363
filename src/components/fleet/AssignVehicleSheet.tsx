import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Package, AlertTriangle } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { ASSIGNABLE_STATUSES, VEHICLE_STATUS_META, type VehicleRow } from "@/lib/fleet-data";

type PendingOrder = {
  id: string; order_number: string; pickup_address: string; dropoff_address: string;
  cargo_weight_tons: number | null; status: string; truck_id: string | null;
};

/** Assign a vehicle to an order (vehicle-first flow used on the Fleet pages). */
export function AssignVehicleSheet({
  vehicle, open, onClose, onAssigned,
}: {
  vehicle: VehicleRow | null;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const assignable = vehicle ? ASSIGNABLE_STATUSES.includes(vehicle.status) : false;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("orders")
      .select("id, order_number, pickup_address, dropoff_address, cargo_weight_tons, status, truck_id")
      .in("status", ["pending", "confirmed"])
      .is("truck_id", null)
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => { setOrders((data as PendingOrder[]) ?? []); setLoading(false); });
  }, [open]);

  const assign = async (o: PendingOrder) => {
    if (!vehicle) return;
    if (!assignable) {
      toast.error(`${vehicle.plate} is ${VEHICLE_STATUS_META[vehicle.status].label.toLowerCase()} and cannot be assigned.`);
      return;
    }
    const weight = Number(o.cargo_weight_tons ?? 0);
    if (weight > Number(vehicle.capacity_tons)) {
      toast.error(`Cargo ${weight}T exceeds the ${vehicle.capacity_tons}T capacity of ${vehicle.plate}.`);
      return;
    }
    setBusy(o.id);
    const { error } = await supabase
      .from("orders")
      .update({ truck_id: vehicle.id, driver_id: vehicle.driver_id, status: "assigned" })
      .eq("id", o.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${vehicle.plate} assigned to ${o.order_number}`);
    onAssigned();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={vehicle ? `Assign ${vehicle.plate}` : "Assign vehicle"}>
      {!assignable && vehicle && (
        <div className="flex items-start gap-2 rounded-2xl status-warning p-3 text-xs mb-3">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            This vehicle is <strong>{VEHICLE_STATUS_META[vehicle.status].label}</strong>. Only available or idle
            vehicles can be assigned to a new order. Update the status first.
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : orders.length === 0 ? (
        <EmptyState icon={Package} title="No unassigned orders" description="Every open order already has a vehicle." />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => {
            const over = vehicle ? Number(o.cargo_weight_tons ?? 0) > Number(vehicle.capacity_tons) : false;
            return (
              <button
                key={o.id}
                onClick={() => assign(o)}
                disabled={!assignable || over || busy !== null}
                className="w-full text-left rounded-2xl border border-border bg-secondary/50 p-3 press disabled:opacity-45 hover:bg-secondary transition"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold font-mono">{o.order_number}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {o.pickup_address} → {o.dropoff_address}
                    </div>
                    {over && <div className="text-[11px] text-destructive mt-0.5">Cargo exceeds vehicle capacity</div>}
                  </div>
                  {busy === o.id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
