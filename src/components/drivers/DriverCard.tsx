import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone, Truck as TruckIcon, IdCard, Star, Package, Settings2, BriefcaseBusiness, AlertTriangle,
} from "lucide-react";
import { DRIVER_STATUS_META, initials, licenceValid, type DriverRow } from "@/lib/driver-data-model";
import { driverMediaUrl } from "@/lib/driver-media";

export function DriverStatusChip({ status }: { status: DriverRow["status"] }) {
  const meta = DRIVER_STATUS_META[status];
  return (
    <span className={`text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${meta.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function DriverAvatar({
  driver, size = 64,
}: { driver: Pick<DriverRow, "photo_url" | "full_name" | "status">; size?: number }) {
  const [photo, setPhoto] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    driverMediaUrl(driver.photo_url).then((u) => { if (alive) setPhoto(u); });
    return () => { alive = false; };
  }, [driver.photo_url]);

  return (
    <div
      className="relative shrink-0 rounded-2xl overflow-hidden bg-primary-soft grid place-items-center"
      style={{ height: size, width: size }}
    >
      {photo ? (
        <img src={photo} alt={`${driver.full_name} portrait`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="font-display font-bold text-primary" style={{ fontSize: size / 3 }}>
          {initials(driver.full_name)}
        </span>
      )}
      <span
        className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-card ${DRIVER_STATUS_META[driver.status].dot}`}
      />
    </div>
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

export function DriverCard({
  driver, vehicleLabel, orderNumber, onOpen, onQuickStatus, onAssign,
}: {
  driver: DriverRow;
  vehicleLabel?: string | null;
  orderNumber?: string | null;
  onOpen: () => void;
  onQuickStatus: () => void;
  onAssign: () => void;
}) {
  const dragged = useRef(false);
  const expired = !licenceValid(driver);

  return (
    <div className="relative overflow-hidden rounded-[22px]">
      <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-3">
        <button
          onClick={onQuickStatus}
          className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-soft press"
          aria-label="Change driver status"
        >
          <Settings2 className="h-4 w-4" />
        </button>
        <button
          onClick={onAssign}
          className="h-11 w-11 rounded-2xl bg-gold text-primary grid place-items-center shadow-gold press"
          aria-label="Assign vehicle"
        >
          <TruckIcon className="h-4 w-4" />
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -116, right: 0 }}
        dragElastic={0.06}
        onDragStart={() => { dragged.current = true; }}
        onDragEnd={() => { setTimeout(() => { dragged.current = false; }, 60); }}
        onClick={() => { if (!dragged.current) onOpen(); }}
        whileTap={{ scale: 0.995 }}
        className="relative card-elevated p-3 cursor-pointer select-none"
      >
        <div className="flex gap-3">
          <DriverAvatar driver={driver} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-[15px] truncate">{driver.full_name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {driver.employee_id ? `#${driver.employee_id} · ` : ""}
                  {driver.licence_class ? `Class ${driver.licence_class}` : "No licence class"}
                  {driver.years_experience ? ` · ${driver.years_experience}y exp` : ""}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <DriverStatusChip status={driver.status} />
                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold">
                  <Star className="h-3 w-3 text-gold fill-gold" />
                  {Number(driver.rating) > 0 ? Number(driver.rating).toFixed(1) : "—"}
                </span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <Meta icon={Phone}>{driver.phone ?? "No phone"}</Meta>
              <Meta icon={IdCard}>{driver.licence_no ?? "No licence no."}</Meta>
              <Meta icon={TruckIcon}>{vehicleLabel ?? "No vehicle"}</Meta>
              <Meta icon={Package}>{orderNumber ?? "No active trip"}</Meta>
              <Meta icon={BriefcaseBusiness}>{driver.employment_type ?? "Employment —"}</Meta>
              <Meta icon={Star}>{driver.total_trips} trips</Meta>
            </div>

            {expired && (
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] status-urgent px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" /> Licence expired
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
