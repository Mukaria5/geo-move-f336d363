import { Link } from "@tanstack/react-router";
import {
  Building2, ChevronRight, Gauge, MapPin, Package, Phone, Radio, Truck as TruckIcon, User,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { StatusChip } from "@/components/fleet/VehicleCard";
import { vehicleTitle, type VehicleRow } from "@/lib/fleet-data";
import { DRIVER_STATUS_META, type DriverRow } from "@/lib/driver-data-model";
import { ORDER_STATUS_META, type OrderRow } from "@/lib/orders-data";
import { TELEMETRY_META, fmtAgo, fmtDuration, routeMetrics, vehicleTelemetry } from "@/lib/tracking-data";

function Row({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

/** Draggable vehicle detail sheet opened from a map marker or the vehicle list. */
export function VehicleSheet({
  vehicle, driver, order, onClose,
}: {
  vehicle: VehicleRow | null;
  driver: DriverRow | null;
  order: OrderRow | null;
  onClose: () => void;
}) {
  const v = vehicle;
  const tel = vehicleTelemetry(v, order);
  const metrics = order ? routeMetrics(order, tel.pos) : null;
  const meta = TELEMETRY_META[tel.source];

  return (
    <BottomSheet open={!!v} onClose={onClose} title={v ? v.plate : ""}>
      {v && (
        <div className="pb-2">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary-soft grid place-items-center shrink-0">
              <TruckIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display font-semibold truncate">{vehicleTitle(v)}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {v.vehicle_type ?? "Vehicle"} · {v.capacity_tons}T
              </div>
            </div>
            <StatusChip status={v.status} />
          </div>

          <div className={`mt-3 rounded-2xl p-2.5 text-[11px] flex items-center gap-2 ${meta.live ? "status-success" : "status-warning"}`}>
            <Radio className="h-3.5 w-3.5 shrink-0" />
            <span><strong>{meta.label}</strong> — {meta.note}</span>
          </div>

          <div className="mt-2 divide-y divide-border/60">
            <Row icon={User} label="Driver"
              value={driver ? `${driver.full_name} · ${DRIVER_STATUS_META[driver.status].label}` : "No driver assigned"} />
            <Row icon={Package} label="Current order"
              value={order ? `${order.order_number} · ${ORDER_STATUS_META[order.status].label}` : "No active order"} />
            <Row icon={Building2} label="Client" value={order?.client_name ?? "—"} />
            <Row icon={MapPin} label="Current location"
              value={tel.pos ? `${tel.pos.lat.toFixed(4)}, ${tel.pos.lng.toFixed(4)}` : "No position available"} />
            <Row icon={Gauge} label="Speed / ETA"
              value={`${tel.speedKmh != null ? `${tel.speedKmh} km/h` : "Speed unavailable"} · ETA ${fmtDuration(metrics?.etaMinutes ?? null)}`} />
            <Row icon={Radio} label="Last update" value={fmtAgo(tel.updatedAt)} />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link
              to="/dashboard/fleet/vehicles/$vehicleId"
              params={{ vehicleId: v.id }}
              className="h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 press"
            >
              View vehicle <ChevronRight className="h-4 w-4" />
            </Link>
            {driver ? (
              <Link
                to="/dashboard/fleet/drivers/$driverId"
                params={{ driverId: driver.id }}
                className="h-11 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center justify-center gap-1 press"
              >
                View driver <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="h-11 rounded-2xl bg-secondary/60 text-sm text-muted-foreground grid place-items-center">No driver</div>
            )}
            {order ? (
              <Link
                to="/dashboard/tracking/$orderId"
                params={{ orderId: order.id }}
                className="h-11 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center justify-center gap-1 press"
              >
                View order <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="h-11 rounded-2xl bg-secondary/60 text-sm text-muted-foreground grid place-items-center">No order</div>
            )}
            <a
              href={driver?.phone ? `tel:${driver.phone}` : undefined}
              aria-disabled={!driver?.phone}
              className={`h-11 rounded-2xl text-sm font-semibold inline-flex items-center justify-center gap-1.5 press ${
                driver?.phone ? "bg-primary-soft text-primary" : "bg-secondary/60 text-muted-foreground pointer-events-none"
              }`}
            >
              <Phone className="h-4 w-4" /> Contact driver
            </a>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
