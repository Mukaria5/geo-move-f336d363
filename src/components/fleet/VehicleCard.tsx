import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Truck as TruckIcon, MapPin, Fuel, Wrench, User, Package,
  CheckCircle2, Settings2, Check,
} from "lucide-react";
import { VEHICLE_STATUS_META, vehicleTitle, type VehicleRow } from "@/lib/fleet-data";
import { vehicleMediaUrl } from "@/lib/vehicle-media";

export function StatusChip({ status }: { status: VehicleRow["status"] }) {
  const meta = VEHICLE_STATUS_META[status];
  return (
    <span className={`text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${meta.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function Meta({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
      <Icon className="h-3 w-3 shrink-0 text-primary/70" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function VehicleCard({
  vehicle, driverName, orderNumber, onOpen, onQuickStatus, onAssign,
  selectionMode, selected, onLongPress, onToggleSelect,
}: {
  vehicle: VehicleRow;
  driverName?: string | null;
  orderNumber?: string | null;
  onOpen: () => void;
  onQuickStatus: () => void;
  onAssign: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onLongPress?: () => void;
  onToggleSelect?: () => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const timer = useRef<any>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    let alive = true;
    vehicleMediaUrl(vehicle.photo_url).then((u) => { if (alive) setPhoto(u); });
    return () => { alive = false; };
  }, [vehicle.photo_url]);

  const startPress = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => { longPressed.current = true; onLongPress?.(); }, 480);
  };
  const endPress = () => clearTimeout(timer.current);

  const handleClick = () => {
    if (longPressed.current) return;
    if (selectionMode) onToggleSelect?.();
    else onOpen();
  };

  return (
    <div className="relative overflow-hidden rounded-[22px]">
      {/* Swipe-revealed quick actions */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-3">
        <button
          onClick={onQuickStatus}
          className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-soft press"
          aria-label="Change status"
        >
          <Settings2 className="h-4 w-4" />
        </button>
        <button
          onClick={onAssign}
          className="h-11 w-11 rounded-2xl bg-gold text-primary grid place-items-center shadow-gold press"
          aria-label="Assign to order"
        >
          <Package className="h-4 w-4" />
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -116, right: 0 }}
        dragElastic={0.06}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onClick={handleClick}
        whileTap={{ scale: 0.995 }}
        className={`relative card-elevated p-3 cursor-pointer select-none ${
          selected ? "ring-2 ring-primary" : ""
        }`}
      >
        <div className="flex gap-3">
          <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-primary-soft grid place-items-center">
            {photo ? (
              <img src={photo} alt={`${vehicle.plate} vehicle`} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <TruckIcon className="h-6 w-6 text-primary" strokeWidth={1.9} />
            )}
            {selectionMode && (
              <div className={`absolute inset-0 grid place-items-center ${selected ? "bg-primary/70" : "bg-foreground/40"}`}>
                {selected ? <Check className="h-5 w-5 text-primary-foreground" /> : <span className="h-4 w-4 rounded-full border-2 border-white" />}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-[15px] truncate flex items-center gap-1.5">
                  {vehicle.plate}
                  {vehicle.verified && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {vehicleTitle(vehicle)}{vehicle.vehicle_type ? ` · ${vehicle.vehicle_type}` : ""}
                  {vehicle.fleet_number ? ` · #${vehicle.fleet_number}` : ""}
                </div>
              </div>
              <StatusChip status={vehicle.status} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <Meta icon={User}>{driverName ?? "Unassigned"}</Meta>
              <Meta icon={TruckIcon}>{Number(vehicle.capacity_tons)}T capacity</Meta>
              <Meta icon={Fuel}>
                {vehicle.fuel_level_pct != null ? `${vehicle.fuel_level_pct}% fuel` : "Fuel —"}
              </Meta>
              <Meta icon={Wrench}>
                {vehicle.last_service_date ? `Serviced ${vehicle.last_service_date}` : "No service log"}
              </Meta>
              <Meta icon={MapPin}>
                {vehicle.current_lat != null && vehicle.current_lng != null
                  ? `${vehicle.current_lat.toFixed(3)}, ${vehicle.current_lng.toFixed(3)}`
                  : "Location unavailable"}
              </Meta>
              <Meta icon={Package}>{orderNumber ? orderNumber : "No active order"}</Meta>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
