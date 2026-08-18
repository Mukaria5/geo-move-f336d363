import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Navigation, Radio, Route as RouteIcon, Truck as TruckIcon, User } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LeafletMap } from "@/components/LeafletMap";
import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { useOrderUnits } from "@/components/tracking/use-dispatch-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ORDER_STATUS_META, ORDER_TIMELINE, type OrderRow, type OrderStatus } from "@/lib/orders-data";
import { TELEMETRY_META, fmtAgo, fmtDuration, routeMetrics, vehicleTelemetry } from "@/lib/tracking-data";

export const Route = createFileRoute("/_protected/dashboard/tracking/$orderId")({
  component: RouteView,
});

function RouteView() {
  const { orderId } = Route.useParams();
  const { role } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["dispatch", "order", orderId],
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").eq("id", orderId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as OrderRow | null;
    },
  });

  const { vehicle, driver } = useOrderUnits(order?.truck_id ?? null, order?.driver_id ?? null);
  const tel = vehicleTelemetry(vehicle, order);
  const metrics = useMemo(() => (order ? routeMetrics(order, tel.pos) : null), [order, tel.pos]);
  const isStaffOrDriver = role !== "client";

  const nextStatus: OrderStatus | null = useMemo(() => {
    if (!order) return null;
    const i = ORDER_TIMELINE.indexOf(order.status === "delayed" ? "in_transit" : order.status);
    return i >= 0 && i < ORDER_TIMELINE.length - 1 ? ORDER_TIMELINE[i + 1]! : null;
  }, [order]);

  async function advance() {
    if (!order || !nextStatus) return;
    setSaving(true);
    const { error } = await supabase.from("orders").update({ status: nextStatus }).eq("id", order.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Status updated to ${ORDER_STATUS_META[nextStatus].label}`);
    qc.invalidateQueries({ queryKey: ["dispatch"] });
  }

  if (isLoading) {
    return (
      <DashboardShell title="Tracking" role="Live">
        <div className="py-14 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      </DashboardShell>
    );
  }

  if (!order || !metrics) {
    return (
      <DashboardShell title="Tracking" role="Live">
        <div className="card-elevated p-6 text-center text-sm text-muted-foreground">Order not found.</div>
      </DashboardShell>
    );
  }

  const meta = TELEMETRY_META[tel.source];

  return (
    <DashboardShell title={order.order_number} role="Route view">
      <div className="relative -mx-4 h-[45vh] overflow-hidden">
        <LeafletMap
          className="h-full w-full"
          pickup={metrics.pickup}
          dropoff={metrics.dropoff}
          markers={metrics.current ? [{ id: "cur", lat: metrics.current.lat, lng: metrics.current.lng, color: "#0d3a2c", glyph: "🚛", pulse: true, active: true }] : []}
          routeLine={metrics.pickup && metrics.dropoff ? [metrics.pickup, metrics.dropoff] : null}
          fitKey={order.id}
        />
      </div>

      <div className="card-elevated p-4 mt-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ORDER_STATUS_META[order.status].color}`}>
            {ORDER_STATUS_META[order.status].label}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">ETA {fmtDuration(metrics.etaMinutes)}</span>
        </div>
        <div className="text-sm font-semibold mt-2 truncate">{order.client_name}</div>
        <div className="mt-1.5 text-sm flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />{order.pickup_address}</div>
        <div className="text-sm flex items-start gap-1.5"><Navigation className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />{order.dropoff_address}</div>

        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="rounded-2xl bg-secondary/60 p-2">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Distance</div>
            <div className="font-display font-bold text-sm">{metrics.totalKm != null ? `${metrics.totalKm} km` : "—"}</div>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-2">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Remaining</div>
            <div className="font-display font-bold text-sm">{metrics.remainingKm != null ? `${metrics.remainingKm} km` : "—"}</div>
          </div>
          <div className="rounded-2xl bg-secondary/60 p-2">
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Duration</div>
            <div className="font-display font-bold text-sm">{fmtDuration(metrics.etaMinutes)}</div>
          </div>
        </div>

        <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${metrics.progressPct}%` }} />
        </div>

        <div className={`mt-3 rounded-2xl p-2.5 text-[11px] flex items-center gap-2 ${meta.live ? "status-success" : "status-warning"}`}>
          <Radio className="h-3.5 w-3.5 shrink-0" />
          <span><strong>{meta.label}</strong> — {meta.note} · updated {fmtAgo(tel.updatedAt)}</span>
        </div>
      </div>

      {isStaffOrDriver && (
        <div className="card-elevated p-4 mt-3 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Assignment</div>
          {vehicle ? (
            <Link to="/dashboard/fleet/vehicles/$vehicleId" params={{ vehicleId: vehicle.id }}
              className="flex items-center gap-2 rounded-2xl bg-secondary/60 p-3 press">
              <TruckIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold font-mono">{vehicle.plate}</span>
            </Link>
          ) : <div className="text-xs text-muted-foreground">No vehicle assigned</div>}
          {driver ? (
            <Link to="/dashboard/fleet/drivers/$driverId" params={{ driverId: driver.id }}
              className="flex items-center gap-2 rounded-2xl bg-secondary/60 p-3 press">
              <User className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{driver.full_name}</span>
            </Link>
          ) : <div className="text-xs text-muted-foreground">No driver assigned</div>}
        </div>
      )}

      <div className="card-elevated p-4 mt-3">
        <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Delivery status</div>
        <OrderTimeline status={order.status} />
      </div>

      {isStaffOrDriver && nextStatus && (
        <button
          onClick={advance}
          disabled={saving}
          className="mt-3 mb-2 w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 press disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RouteIcon className="h-4 w-4" />}
          Mark as {ORDER_STATUS_META[nextStatus].label}
        </button>
      )}
    </DashboardShell>
  );
}
