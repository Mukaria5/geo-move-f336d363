import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, ShieldAlert, Truck as TruckIcon, User } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { vehicleTitle, type VehicleRow } from "@/lib/fleet-data";
import { DRIVER_STATUS_META, type DriverRow } from "@/lib/driver-data-model";
import { ORDER_STATUS_META, type OrderRow } from "@/lib/orders-data";
import { driverAssignmentIssue, isActiveOrder, vehicleAssignmentIssue } from "@/lib/tracking-data";

/**
 * Fast assignment flow. Eligibility uses the SAME rules as Orders and Driver
 * Management: no suspended drivers, no expired licences, no busy drivers, no
 * vehicles already on an active trip and none under maintenance.
 */
export function AssignSheet({
  order, vehicles, drivers, orders, onClose, onAssigned,
}: {
  order: OrderRow | null;
  vehicles: VehicleRow[];
  drivers: DriverRow[];
  orders: OrderRow[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [truckId, setTruckId] = useState<string | null>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeOrders = useMemo(
    () => orders.filter((o) => isActiveOrder(o) && o.id !== order?.id),
    [orders, order?.id],
  );

  const vehicleOptions = useMemo(
    () => vehicles.map((v) => ({ v, issue: vehicleAssignmentIssue(v, activeOrders) })),
    [vehicles, activeOrders],
  );
  const driverOptions = useMemo(
    () => drivers.filter((d) => d.user_id).map((d) => ({ d, issue: driverAssignmentIssue(d) })),
    [drivers],
  );

  async function confirm() {
    if (!order || !truckId || !driverId) return;
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver?.user_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ truck_id: truckId, driver_id: driver.user_id, status: "assigned" })
        .eq("id", order.id);
      if (error) throw error;

      // Keep Fleet + Driver records in step with the order.
      await supabase
        .from("drivers")
        .update({ status: "assigned", current_order_id: order.id, assigned_truck_id: truckId })
        .eq("id", driver.id);
      await supabase
        .from("trucks")
        .update({ status: "assigned", current_order_id: order.id })
        .eq("id", truckId);

      toast.success(`${order.order_number} assigned to ${driver.full_name}`);
      setTruckId(null);
      setDriverId(null);
      onAssigned();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not assign this order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet open={!!order} onClose={onClose} title="Assign order">
      {order && (
        <div className="pb-2">
          <div className="card-premium p-4 relative overflow-hidden">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary-foreground/70">
              {order.order_number} · {ORDER_STATUS_META[order.status].label}
            </div>
            <div className="font-display text-lg font-bold text-primary-foreground mt-1 truncate">{order.client_name}</div>
            <div className="text-primary-foreground/75 text-xs mt-1 truncate">{order.pickup_address}</div>
            <div className="text-primary-foreground/75 text-xs truncate">→ {order.dropoff_address}</div>
          </div>

          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-4 mb-2">
            Eligible drivers
          </div>
          <div className="space-y-1.5">
            {driverOptions.length === 0 && (
              <div className="text-xs text-muted-foreground">No drivers on the roster yet.</div>
            )}
            {driverOptions.map(({ d, issue }) => (
              <button
                key={d.id}
                disabled={!!issue}
                onClick={() => setDriverId(d.id)}
                className={`w-full text-left rounded-2xl p-3 flex items-center gap-3 press ${
                  driverId === d.id ? "bg-primary text-primary-foreground" : "bg-secondary/60"
                } ${issue ? "opacity-55 cursor-not-allowed" : ""}`}
              >
                <User className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{d.full_name}</div>
                  <div className="text-[11px] truncate opacity-80">
                    {issue ?? `${DRIVER_STATUS_META[d.status].label} · ${d.licence_class ?? "Licence"} · ${d.total_trips} trips`}
                  </div>
                </div>
                {issue ? <ShieldAlert className="h-4 w-4 shrink-0" /> : driverId === d.id ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-4 mb-2">
            Eligible vehicles
          </div>
          <div className="space-y-1.5">
            {vehicleOptions.length === 0 && (
              <div className="text-xs text-muted-foreground">No vehicles registered yet.</div>
            )}
            {vehicleOptions.map(({ v, issue }) => (
              <button
                key={v.id}
                disabled={!!issue}
                onClick={() => setTruckId(v.id)}
                className={`w-full text-left rounded-2xl p-3 flex items-center gap-3 press ${
                  truckId === v.id ? "bg-primary text-primary-foreground" : "bg-secondary/60"
                } ${issue ? "opacity-55 cursor-not-allowed" : ""}`}
              >
                <TruckIcon className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold font-mono truncate">{v.plate}</div>
                  <div className="text-[11px] truncate opacity-80">
                    {issue ?? `${vehicleTitle(v)} · ${v.capacity_tons}T available`}
                  </div>
                </div>
                {issue ? <ShieldAlert className="h-4 w-4 shrink-0" /> : truckId === v.id ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            ))}
          </div>

          <button
            onClick={confirm}
            disabled={!truckId || !driverId || saving}
            className="mt-4 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 press disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Confirm assignment
          </button>
        </div>
      )}
    </BottomSheet>
  );
}
