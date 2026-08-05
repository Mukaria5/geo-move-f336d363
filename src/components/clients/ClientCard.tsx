import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone, Mail, Package, Settings2, Building2, CalendarClock, Wallet, UserRound, FileText,
} from "lucide-react";
import { CLIENT_STATUS_META, initials, type ClientRow } from "@/lib/crm-data";
import { clientMediaUrl } from "@/lib/client-media";
import { ksh } from "@/lib/orders-data";

export function ClientStatusChip({ status }: { status: ClientRow["status"] }) {
  const meta = CLIENT_STATUS_META[status];
  return (
    <span className={`text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${meta.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function ClientAvatar({
  client, size = 56,
}: { client: Pick<ClientRow, "logo_url" | "name" | "status">; size?: number }) {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    clientMediaUrl(client.logo_url).then((u) => { if (alive) setLogo(u); });
    return () => { alive = false; };
  }, [client.logo_url]);

  return (
    <div
      className="relative shrink-0 rounded-2xl overflow-hidden bg-primary-soft grid place-items-center"
      style={{ height: size, width: size }}
    >
      {logo ? (
        <img src={logo} alt={`${client.name} logo`} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="font-display font-bold text-primary" style={{ fontSize: size / 3 }}>
          {initials(client.name)}
        </span>
      )}
      <span
        className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-card ${CLIENT_STATUS_META[client.status].dot}`}
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

export function ClientCard({
  client, activeOrders, lastOrder, revenue, selected, selectable, onToggleSelect, onOpen, onQuickStatus, onNewOrder,
}: {
  client: ClientRow;
  activeOrders: number;
  lastOrder: string | null;
  revenue: number;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: () => void;
  onOpen: () => void;
  onQuickStatus: () => void;
  onNewOrder: () => void;
}) {
  const dragged = useRef(false);

  return (
    <div className="relative overflow-hidden rounded-[22px]">
      <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-3">
        <button
          onClick={onQuickStatus}
          className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-soft press"
          aria-label="Change client status"
        >
          <Settings2 className="h-4 w-4" />
        </button>
        <button
          onClick={onNewOrder}
          className="h-11 w-11 rounded-2xl bg-gold text-primary grid place-items-center shadow-gold press"
          aria-label="New order for client"
        >
          <Package className="h-4 w-4" />
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -116, right: 0 }}
        dragElastic={0.06}
        onDragStart={() => { dragged.current = true; }}
        onDragEnd={() => { setTimeout(() => { dragged.current = false; }, 60); }}
        onClick={() => {
          if (dragged.current) return;
          if (selectable && onToggleSelect) onToggleSelect();
          else onOpen();
        }}
        whileTap={{ scale: 0.995 }}
        className={`relative card-elevated p-3 cursor-pointer select-none ${
          selected ? "ring-2 ring-primary" : ""
        }`}
      >
        <div className="flex gap-3">
          {selectable && (
            <div className="pt-1">
              <span
                className={`h-5 w-5 rounded-md border grid place-items-center text-[10px] ${
                  selected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                }`}
              >
                {selected ? "✓" : ""}
              </span>
            </div>
          )}
          <ClientAvatar client={client} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-[15px] truncate">{client.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {client.client_code ? `${client.client_code} · ` : ""}
                  {client.industry ?? (client.client_type === "individual" ? "Individual" : "Business")}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <ClientStatusChip status={client.status} />
                <span className="text-[11px] font-semibold font-mono">{ksh(revenue)}</span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <Meta icon={UserRound}>{client.contact_name ?? "No contact"}</Meta>
              <Meta icon={Phone}>{client.contact_phone ?? "No phone"}</Meta>
              <Meta icon={Mail}>{client.contact_email ?? "No email"}</Meta>
              <Meta icon={Package}>{activeOrders} active order{activeOrders === 1 ? "" : "s"}</Meta>
              <Meta icon={CalendarClock}>
                {lastOrder ? new Date(lastOrder).toLocaleDateString() : "No orders yet"}
              </Meta>
              <Meta icon={Wallet}>{ksh(Number(client.outstanding_balance ?? 0))} due</Meta>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ClientTypeIcon({ type }: { type: ClientRow["client_type"] }) {
  return type === "business"
    ? <Building2 className="h-4 w-4 text-primary" />
    : <FileText className="h-4 w-4 text-primary" />;
}
