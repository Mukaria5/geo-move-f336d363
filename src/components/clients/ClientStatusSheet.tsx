import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { supabase } from "@/integrations/supabase/client";
import {
  CLIENT_STATUSES, CLIENT_STATUS_META, type ClientRow, type ClientStatus,
} from "@/lib/crm-data";

export function ClientStatusSheet({
  client, open, onClose, onChanged,
}: {
  client: ClientRow | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState<ClientStatus | null>(null);

  async function apply(status: ClientStatus) {
    if (!client) return;
    setSaving(status);
    const { error } = await supabase.from("clients").update({ status }).eq("id", client.id);
    if (error) {
      toast.error(error.message);
    } else {
      await supabase.from("client_activity").insert({
        client_id: client.id,
        kind: "status",
        title: `Status changed to ${CLIENT_STATUS_META[status].label}`,
      });
      toast.success(`${client.name} · ${CLIENT_STATUS_META[status].label}`);
      onChanged();
      onClose();
    }
    setSaving(null);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={client ? client.name : "Client status"}>
      <div className="space-y-2 pb-2">
        {CLIENT_STATUSES.map((s) => {
          const meta = CLIENT_STATUS_META[s];
          const current = client?.status === s;
          return (
            <button
              key={s}
              onClick={() => apply(s)}
              disabled={!!saving}
              className={`w-full flex items-center gap-3 rounded-2xl p-3 press border transition ${
                current ? "border-primary bg-primary-soft" : "border-border bg-card"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
              <span className="flex-1 text-left text-sm font-medium">{meta.label}</span>
              {saving === s && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              {current && !saving && <span className="text-[11px] text-primary font-semibold">Current</span>}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
