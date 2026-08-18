import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { OrderCardRow } from "@/components/tracking/OrderCardRow";
import { AssignSheet } from "@/components/tracking/AssignSheet";
import { useDispatchData } from "@/components/tracking/use-dispatch-data";
import { BOARD_COLUMNS, columnFor, isUnassigned } from "@/lib/tracking-data";
import type { OrderRow } from "@/lib/orders-data";

export const Route = createFileRoute("/_protected/dashboard/tracking/board")({
  component: DispatchBoard,
});

function DispatchBoard() {
  const { orders, vehicles, drivers, loading, refetch } = useDispatchData();
  const navigate = useNavigate();
  const [assign, setAssign] = useState<OrderRow | null>(null);

  const driverByUser = useMemo(
    () => new Map(drivers.filter((d) => d.user_id).map((d) => [d.user_id as string, d])),
    [drivers],
  );

  const columns = useMemo(() => {
    const map: Record<string, OrderRow[]> = {};
    BOARD_COLUMNS.forEach((c) => { map[c.key] = []; });
    orders.forEach((o) => {
      if (o.status === "cancelled") return;
      const key = columnFor(o);
      (map[key] ??= []).push(o);
    });
    return map;
  }, [orders]);

  return (
    <DashboardShell title="Dispatch board" role="Operations">
      {loading ? (
        <div className="py-14 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-3 pb-4" style={{ minWidth: "min-content" }}>
            {BOARD_COLUMNS.map((col) => {
              const list = columns[col.key] ?? [];
              return (
                <section key={col.key} className="w-[80vw] max-w-[320px] shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-sm font-display font-semibold">{col.label}</h2>
                    <span className="text-[11px] rounded-full bg-secondary px-2 py-0.5">{list.length}</span>
                  </div>
                  <div className="space-y-2">
                    {!list.length && (
                      <div className="rounded-2xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">
                        Empty
                      </div>
                    )}
                    {list.map((o) => (
                      <div key={o.id} className="space-y-1.5">
                        <OrderCardRow
                          order={o}
                          vehicle={o.truck_id ? vehicles.find((v) => v.id === o.truck_id) : null}
                          driver={o.driver_id ? driverByUser.get(o.driver_id) : null}
                          onClick={() =>
                            isUnassigned(o)
                              ? setAssign(o)
                              : navigate({ to: "/dashboard/tracking/$orderId", params: { orderId: o.id } })
                          }
                        />
                        {isUnassigned(o) && (
                          <button
                            onClick={() => setAssign(o)}
                            className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold press"
                          >
                            Assign driver & vehicle
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <AssignSheet
        order={assign}
        orders={orders}
        vehicles={vehicles}
        drivers={drivers}
        onClose={() => setAssign(null)}
        onAssigned={refetch}
      />
    </DashboardShell>
  );
}
