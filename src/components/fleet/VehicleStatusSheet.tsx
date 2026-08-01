import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { VEHICLE_STATUSES, VEHICLE_STATUS_META, type VehicleRow } from "@/lib/fleet-data";

export function VehicleStatusSheet({
  vehicle, open, onClose, onChanged,
}: {
  vehicle: VehicleRow | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const apply = async (status: string) => {
    if (!vehicle) return;
    setBusy(status);
    const { error } = await supabase
      .from("trucks")
      .update({
        status: status as VehicleRow["status"],
        is_available: status === "available" || status === "idle",
        is_online: status !== "offline" && status !== "out_of_service",
      })
      .eq("id", vehicle.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${vehicle.plate} · ${VEHICLE_STATUS_META[status as VehicleRow["status"]].label}`);
    onChanged();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={vehicle ? `Status · ${vehicle.plate}` : "Status"}>
      <div className="text-xs text-muted-foreground mb-3">
        Every change is timestamped and recorded in the vehicle history.
      </div>
      <div className="grid grid-cols-2 gap-2">
        {VEHICLE_STATUSES.map((s) => {
          const meta = VEHICLE_STATUS_META[s];
          const active = vehicle?.status === s;
          return (
            <button
              key={s}
              onClick={() => apply(s)}
              disabled={busy !== null}
              className={`flex items-center gap-2 rounded-2xl border p-3 text-left press transition ${
                active ? "border-primary bg-primary-soft" : "border-border bg-secondary/50 hover:bg-secondary"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
              <span className="text-sm font-medium flex-1">{meta.label}</span>
              {busy === s && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
