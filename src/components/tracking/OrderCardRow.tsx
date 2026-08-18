import { ArrowRight, Clock, MapPin, Truck as TruckIcon, User } from "lucide-react";
import { ORDER_STATUS_META, type OrderRow } from "@/lib/orders-data";
import type { VehicleRow } from "@/lib/fleet-data";
import type { DriverRow } from "@/lib/driver-data-model";
import { PRIORITY_META, fmtDuration, orderPriority, routeMetrics, vehicleTelemetry } from "@/lib/tracking-data";

/** Compact active-order card used in the operations panel and the board. */
export function OrderCardRow({
  order, vehicle, driver, onClick, selected, compact,
}: {
  order: OrderRow;
  vehicle?: VehicleRow | null;
  driver?: DriverRow | null;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
}) {
  const tel = vehicleTelemetry(vehicle, order);
  const m = routeMetrics(order, tel.pos);
  const prio = orderPriority(order);
  const st = ORDER_STATUS_META[order.status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left card-elevated p-3 press ${selected ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold truncate">{order.order_number}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${st.color}`}>{st.label}</span>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${PRIORITY_META[prio].chip}`}>
          {PRIORITY_META[prio].label}
        </span>
      </div>

      <div className="text-sm font-semibold truncate mt-1">{order.client_name}</div>

      <div className="mt-1.5 space-y-0.5">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">{order.pickup_address}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
          <span className="truncate">{order.dropoff_address}</span>
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 min-w-0">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{driver?.full_name ?? "Unassigned driver"}</span>
          </span>
          <span className="inline-flex items-center gap-1 min-w-0">
            <TruckIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{vehicle?.plate ?? "Unassigned vehicle"}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" /> ETA {fmtDuration(m.etaMinutes)}
          </span>
        </div>
      )}

      <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${m.progressPct}%` }} />
      </div>
    </button>
  );
}
