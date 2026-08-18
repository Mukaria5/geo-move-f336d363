import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, BellOff, Check, ShieldAlert } from "lucide-react";
import type { DispatchAlert } from "@/lib/tracking-data";
import { ALERT_META } from "@/lib/tracking-data";

const SEV: Record<DispatchAlert["severity"], string> = {
  urgent: "status-urgent",
  warning: "status-warning",
  info: "status-info",
};

/**
 * Operational alerts layer. Acknowledgement/dismissal is per-session state —
 * the underlying conditions still live in Fleet / Driver / Orders records.
 */
export function AlertsPanel({ alerts, onOpen }: { alerts: DispatchAlert[]; onOpen?: (a: DispatchAlert) => void }) {
  const [acked, setAcked] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const visible = alerts.filter((a) => !dismissed[a.id]);

  if (!visible.length) {
    return (
      <div className="card-elevated p-5 text-center">
        <ShieldAlert className="h-6 w-6 text-primary mx-auto" />
        <div className="text-sm font-semibold mt-2">No open alerts</div>
        <div className="text-xs text-muted-foreground mt-0.5">Fleet, drivers and deliveries are all healthy.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {visible.map((a) => (
          <motion.div
            key={a.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: acked[a.id] ? 0.55 : 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="card-elevated p-3"
          >
            <div className="flex items-start gap-2.5">
              <div className={`h-8 w-8 rounded-xl grid place-items-center shrink-0 ${SEV[a.severity]}`}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <button
                type="button"
                onClick={() => onOpen?.(a)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="text-sm font-semibold truncate">{a.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">{a.detail}</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
                  {ALERT_META[a.kind].label}
                </div>
              </button>
            </div>
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => setAcked((p) => ({ ...p, [a.id]: true }))}
                disabled={!!acked[a.id]}
                className="flex-1 h-9 rounded-xl bg-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5 press disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" /> {acked[a.id] ? "Acknowledged" : "Acknowledge"}
              </button>
              <button
                onClick={() => setDismissed((p) => ({ ...p, [a.id]: true }))}
                className="flex-1 h-9 rounded-xl bg-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5 press"
              >
                <BellOff className="h-3.5 w-3.5" /> Dismiss
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
