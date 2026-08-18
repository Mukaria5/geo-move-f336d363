import { motion } from "framer-motion";
import { Activity, AlertTriangle, Navigation, PlugZap, UserCheck, Inbox } from "lucide-react";
import type { DispatchKpis } from "@/lib/tracking-data";

const TONES: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  card: "bg-card text-foreground",
  warn: "bg-orange-100 text-orange-900",
  urgent: "bg-rose-100 text-rose-900",
};

function Kpi({
  label, value, icon: Icon, tone = "card", onClick, active,
}: {
  label: string; value: number; icon: any; tone?: keyof typeof TONES;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`shrink-0 min-w-[112px] rounded-2xl px-3 py-2.5 text-left shadow-soft border press ${TONES[tone]} ${
        active ? "border-primary ring-2 ring-primary/30" : "border-border/60"
      }`}
    >
      <div className="flex items-center gap-1.5 opacity-80">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] font-mono uppercase tracking-[0.12em] truncate">{label}</span>
      </div>
      <div className="font-display text-xl font-bold leading-none mt-1.5">{value}</div>
    </motion.button>
  );
}

/** Compact floating KPI cards that overlay the dispatch map. */
export function KpiStrip({
  kpis, filter, onFilter,
}: {
  kpis: DispatchKpis;
  filter: string | null;
  onFilter: (key: string | null) => void;
}) {
  const toggle = (k: string) => onFilter(filter === k ? null : k);
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      <Kpi label="Active" value={kpis.activeDeliveries} icon={Activity} tone="primary"
        active={filter === "active"} onClick={() => toggle("active")} />
      <Kpi label="Moving" value={kpis.vehiclesMoving} icon={Navigation}
        active={filter === "moving"} onClick={() => toggle("moving")} />
      <Kpi label="On duty" value={kpis.driversOnDuty} icon={UserCheck}
        active={filter === "onduty"} onClick={() => toggle("onduty")} />
      <Kpi label="Delayed" value={kpis.delayed} icon={AlertTriangle} tone={kpis.delayed ? "urgent" : "card"}
        active={filter === "delayed"} onClick={() => toggle("delayed")} />
      <Kpi label="Offline" value={kpis.offlineVehicles} icon={PlugZap} tone={kpis.offlineVehicles ? "warn" : "card"}
        active={filter === "offline"} onClick={() => toggle("offline")} />
      <Kpi label="Unassigned" value={kpis.unassigned} icon={Inbox} tone={kpis.unassigned ? "warn" : "card"}
        active={filter === "unassigned"} onClick={() => toggle("unassigned")} />
    </div>
  );
}
