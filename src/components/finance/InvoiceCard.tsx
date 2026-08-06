import { useRef } from "react";
import { motion } from "framer-motion";
import { Receipt, CalendarClock, Wallet, Package, Banknote, FileDown } from "lucide-react";
import { ksh } from "@/lib/orders-data";
import {
  INVOICE_STATUS_META, effectiveStatus, isDueSoon, outstanding, type InvoiceRow,
} from "@/lib/finance-data";

export function InvoiceStatusChip({ invoice }: { invoice: InvoiceRow }) {
  const st = effectiveStatus(invoice);
  const meta = INVOICE_STATUS_META[st];
  const dueSoon = isDueSoon(invoice) && st !== "overdue";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${meta.chip}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      {dueSoon && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full status-warning">Due soon</span>
      )}
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

export function InvoiceCard({
  invoice, orderNumber, onOpen, onRecordPayment, onDownload,
}: {
  invoice: InvoiceRow;
  orderNumber?: string | null;
  onOpen: () => void;
  onRecordPayment: () => void;
  onDownload: () => void;
}) {
  const dragged = useRef(false);
  const bal = outstanding(invoice);

  return (
    <div className="relative overflow-hidden rounded-[22px]">
      <div className="absolute inset-y-0 right-0 flex items-center gap-1.5 pr-3">
        <button
          onClick={onDownload}
          className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-soft press"
          aria-label="Download invoice PDF"
        >
          <FileDown className="h-4 w-4" />
        </button>
        <button
          onClick={onRecordPayment}
          className="h-11 w-11 rounded-2xl bg-gold text-primary grid place-items-center shadow-gold press"
          aria-label="Record payment"
        >
          <Banknote className="h-4 w-4" />
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
          <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary-soft grid place-items-center">
            <Receipt className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold text-[15px] truncate">{invoice.invoice_number}</div>
                <div className="text-[11px] text-muted-foreground truncate">{invoice.client_name || "Unassigned client"}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <InvoiceStatusChip invoice={invoice} />
                <span className="text-[11px] font-semibold font-mono">{ksh(invoice.total)}</span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <Meta icon={CalendarClock}>Due {new Date(invoice.due_date).toLocaleDateString()}</Meta>
              <Meta icon={Package}>{orderNumber ? orderNumber : "No linked order"}</Meta>
              <Meta icon={Wallet}>{ksh(invoice.amount_paid)} paid</Meta>
              <Meta icon={Banknote}>{ksh(bal)} outstanding</Meta>
            </div>

            <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, invoice.total ? (invoice.amount_paid / invoice.total) * 100 : 0)}%` }}
                transition={{ duration: 0.45 }}
                className="h-full bg-primary"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
