import { Check } from "lucide-react";
import { ORDER_TIMELINE, ORDER_STATUS_META, type OrderStatus } from "@/lib/orders-data";

/** Full delivery timeline, shared by staff, client and driver views. */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  const idx = ORDER_TIMELINE.indexOf(status === "delayed" ? "in_transit" : status);
  return (
    <ol className="relative pl-6">
      <span className="absolute left-[9px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {ORDER_TIMELINE.map((s, i) => {
        const done = idx >= 0 && i < idx;
        const current = i === idx;
        return (
          <li key={s} className="relative py-1.5">
            <span
              className={`absolute -left-6 top-2 h-[18px] w-[18px] rounded-full grid place-items-center border-2 ${
                done ? "bg-primary border-primary" : current ? "bg-primary/15 border-primary" : "bg-card border-border"
              }`}
            >
              {done && <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3.5} />}
              {current && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
            <div className={`text-sm ${current ? "font-semibold" : done ? "" : "text-muted-foreground"}`}>
              {ORDER_STATUS_META[s].label}
            </div>
          </li>
        );
      })}
      {status === "delayed" && (
        <li className="relative py-1.5">
          <span className="absolute -left-6 top-2 h-[18px] w-[18px] rounded-full bg-orange-500 border-2 border-orange-500" />
          <div className="text-sm font-semibold text-orange-700">Delayed — running behind schedule</div>
        </li>
      )}
    </ol>
  );
}
