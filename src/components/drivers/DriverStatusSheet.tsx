import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { DRIVER_STATUSES, DRIVER_STATUS_META, type DriverRow } from "@/lib/driver-data-model";

export function DriverStatusSheet({
  driver, open, onClose, onChanged,
}: {
  driver: DriverRow | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const apply = async (status: string) => {
    if (!driver) return;
    setBusy(status);
    const { error } = await supabase
      .from("drivers")
      .update({ status: status as DriverRow["status"], status_note: note.trim() || null })
      .eq("id", driver.id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`${driver.full_name} · ${DRIVER_STATUS_META[status as DriverRow["status"]].label}`);
    setNote("");
    onChanged();
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={driver ? `Status · ${driver.full_name}` : "Status"}>
      <div className="text-xs text-muted-foreground mb-3">
        Availability changes are timestamped and stored in the driver history.
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g. annual leave until Friday)"
        maxLength={160}
        className="w-full rounded-xl border border-border bg-secondary/40 h-11 px-3 text-sm outline-none mb-3"
      />
      <div className="grid grid-cols-2 gap-2 pb-2">
        {DRIVER_STATUSES.map((s) => {
          const meta = DRIVER_STATUS_META[s];
          const active = driver?.status === s;
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
