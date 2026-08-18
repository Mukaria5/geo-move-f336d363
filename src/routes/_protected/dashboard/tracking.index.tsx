import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutList, Loader2, Bell, PanelLeftClose, PanelLeft, Navigation } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LeafletMap, type MapMarker } from "@/components/LeafletMap";
import { KpiStrip } from "@/components/tracking/KpiStrip";
import { OrderCardRow } from "@/components/tracking/OrderCardRow";
import { AlertsPanel } from "@/components/tracking/AlertsPanel";
import { VehicleSheet } from "@/components/tracking/VehicleSheet";
import { OrderTimeline } from "@/components/tracking/OrderTimeline";
import { useDispatchData, useMyOrders } from "@/components/tracking/use-dispatch-data";
import { useAuth } from "@/lib/auth-context";
import { ORDER_STATUS_META } from "@/lib/orders-data";
import { vehicleMarkerColor } from "@/lib/tracking-data";
import {
  buildDispatchAlerts, dispatchKpis, fmtDuration, isActiveOrder, routeMetrics,
  vehicleTelemetry, TELEMETRY_META,
} from "@/lib/tracking-data";

export const Route = createFileRoute("/_protected/dashboard/tracking/")({
  component: TrackingHome,
});

function TrackingHome() {
  const { role } = useAuth();
  if (role === "client") return <ClientTracking />;
  if (role === "driver") return <DriverTracking />;
  return <DispatchCenter />;
}

/* ---------------------------------------------------------------- */
/* Dispatch Center — fleet owner / manager / dispatcher / admin      */
/* ---------------------------------------------------------------- */

function DispatchCenter() {
  const { orders, vehicles, drivers, loading } = useDispatchData();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<"orders" | "alerts" | "units">("orders");

  const kpis = useMemo(() => dispatchKpis(orders, vehicles, drivers), [orders, vehicles, drivers]);
  const alerts = useMemo(() => buildDispatchAlerts(orders, vehicles, drivers), [orders, vehicles, drivers]);
  const active = useMemo(() => orders.filter(isActiveOrder), [orders]);

  const driverByUser = useMemo(
    () => new Map(drivers.filter((d) => d.user_id).map((d) => [d.user_id as string, d])),
    [drivers],
  );
  const orderByTruck = useMemo(() => {
    const m = new Map<string, typeof orders[number]>();
    active.forEach((o) => { if (o.truck_id) m.set(o.truck_id, o); });
    return m;
  }, [active]);

  const visibleVehicles = useMemo(() => {
    if (filter === "moving") return vehicles.filter((v) => v.status === "on_trip");
    if (filter === "offline") return vehicles.filter((v) => v.status === "offline" || v.tracker_status === "offline");
    return vehicles;
  }, [vehicles, filter]);

  const markers: MapMarker[] = useMemo(() => {
    const out: MapMarker[] = [];
    visibleVehicles.forEach((v) => {
      const order = v.id ? orderByTruck.get(v.id) ?? null : null;
      const tel = vehicleTelemetry(v, order);
      if (!tel.pos) return;
      out.push({
        id: v.id,
        lat: tel.pos.lat,
        lng: tel.pos.lng,
        color: vehicleMarkerColor(v.status),
        glyph: "🚛",
        tooltip: `${v.plate} · ${order?.order_number ?? "No order"}`,
        active: selectedVehicle === v.id,
        pulse: v.status === "on_trip",
      });
    });
    return out;
  }, [visibleVehicles, orderByTruck, selectedVehicle]);

  const focused = active.find((o) => o.id === selectedOrder) ?? null;
  const focusedVehicle = focused?.truck_id ? vehicles.find((v) => v.id === focused.truck_id) ?? null : null;
  const routeLine = useMemo(() => {
    if (!focused) return null;
    const m = routeMetrics(focused, vehicleTelemetry(focusedVehicle, focused).pos);
    return m.pickup && m.dropoff ? [m.pickup, m.dropoff] : null;
  }, [focused, focusedVehicle]);

  const sheetVehicle = vehicles.find((v) => v.id === selectedVehicle) ?? null;
  const sheetOrder = sheetVehicle ? orderByTruck.get(sheetVehicle.id) ?? null : null;
  const sheetDriver = sheetOrder?.driver_id ? driverByUser.get(sheetOrder.driver_id) ?? null : null;

  const panel = (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 bg-secondary rounded-2xl p-1">
        {(["orders", "alerts", "units"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`h-9 rounded-xl text-xs font-semibold capitalize press ${
              tab === t ? "bg-card shadow-soft" : "text-muted-foreground"
            }`}
          >
            {t === "alerts" ? `Alerts${alerts.length ? ` (${alerts.length})` : ""}` : t}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="space-y-2">
          {loading && <div className="py-6 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
          {!loading && !active.length && (
            <div className="card-elevated p-5 text-center text-sm text-muted-foreground">
              Nothing is moving right now.
            </div>
          )}
          {active.map((o) => (
            <OrderCardRow
              key={o.id}
              order={o}
              vehicle={o.truck_id ? vehicles.find((v) => v.id === o.truck_id) : null}
              driver={o.driver_id ? driverByUser.get(o.driver_id) : null}
              selected={selectedOrder === o.id}
              onClick={() => {
                setSelectedOrder(o.id);
                if (o.truck_id) setSelectedVehicle(null);
              }}
            />
          ))}
        </div>
      )}

      {tab === "alerts" && (
        <AlertsPanel
          alerts={alerts}
          onOpen={(a) => {
            if (a.orderId) navigate({ to: "/dashboard/tracking/$orderId", params: { orderId: a.orderId } });
            else if (a.vehicleId) setSelectedVehicle(a.vehicleId);
          }}
        />
      )}

      {tab === "units" && (
        <div className="space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">Vehicles</div>
          {vehicles.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVehicle(v.id)}
              className="w-full text-left card-elevated p-3 flex items-center gap-2.5 press"
            >
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: vehicleMarkerColor(v.status) }} />
              <span className="font-mono text-sm font-semibold truncate">{v.plate}</span>
              <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                {orderByTruck.get(v.id)?.order_number ?? "idle"}
              </span>
            </button>
          ))}
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground pt-2">Drivers</div>
          {drivers.map((d) => (
            <Link
              key={d.id}
              to="/dashboard/fleet/drivers/$driverId"
              params={{ driverId: d.id }}
              className="w-full card-elevated p-3 flex items-center gap-2.5 press"
            >
              <span className="text-sm font-semibold truncate">{d.full_name}</span>
              <span className="ml-auto text-[11px] text-muted-foreground shrink-0">{d.status}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <DashboardShell title="Dispatch center" role="Live tracking">
      <div className="lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-4">
        {/* Desktop operations panel */}
        <aside className={`hidden lg:block ${panelOpen ? "" : "lg:hidden"}`}>
          <div className="max-h-[74vh] overflow-y-auto pr-1">{panel}</div>
        </aside>

        <div className="min-w-0">
          <div className="relative -mx-4 lg:mx-0 rounded-none lg:rounded-3xl overflow-hidden">
            <div className="h-[58vh] lg:h-[74vh]">
              <LeafletMap
                className="h-full w-full"
                zoom={11}
                markers={markers}
                routeLine={routeLine}
                fitKey={`${markers.length}-${selectedOrder ?? ""}`}
                onMarkerClick={(id) => { setSelectedVehicle(id); setSelectedOrder(null); }}
              />
            </div>

            {/* Floating KPI overlay */}
            <div className="absolute top-3 left-3 right-3 z-[500]">
              <KpiStrip kpis={kpis} filter={filter} onFilter={setFilter} />
            </div>

            <button
              onClick={() => setPanelOpen((p) => !p)}
              className="hidden lg:inline-flex absolute bottom-4 left-4 z-[500] h-10 px-3 rounded-full bg-card shadow-float items-center gap-2 text-xs font-semibold press"
            >
              {panelOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              {panelOpen ? "Hide panel" : "Show panel"}
            </button>

            {/* Focused order card */}
            <AnimatePresence>
              {focused && (
                <motion.div
                  initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
                  className="absolute inset-x-3 bottom-3 z-[500] card-elevated p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold">{focused.order_number}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ORDER_STATUS_META[focused.status].color}`}>
                      {ORDER_STATUS_META[focused.status].label}
                    </span>
                    <Link
                      to="/dashboard/tracking/$orderId"
                      params={{ orderId: focused.id }}
                      className="ml-auto text-[11px] font-semibold text-primary press"
                    >
                      Route details
                    </Link>
                  </div>
                  <div className="text-sm font-semibold truncate mt-0.5">{focused.client_name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {focused.pickup_address} → {focused.dropoff_address}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile operations panel */}
          <div className="lg:hidden mt-3">{panel}</div>

          <Link
            to="/dashboard/tracking/board"
            className="mt-3 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 press lg:max-w-xs"
          >
            <LayoutList className="h-4 w-4" /> Open dispatch board
            {kpis.unassigned > 0 && (
              <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[11px]">
                {kpis.unassigned} unassigned
              </span>
            )}
          </Link>
        </div>
      </div>

      <VehicleSheet
        vehicle={sheetVehicle}
        driver={sheetDriver}
        order={sheetOrder}
        onClose={() => setSelectedVehicle(null)}
      />
    </DashboardShell>
  );
}

/* ---------------------------------------------------------------- */
/* Client tracking — own orders only                                 */
/* ---------------------------------------------------------------- */

function ClientTracking() {
  const { orders, loading } = useMyOrders("client");
  const live = orders.filter(isActiveOrder);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = live.find((o) => o.id === openId) ?? live[0] ?? null;
  const metrics = open ? routeMetrics(open, null) : null;

  return (
    <DashboardShell title="Track my shipments" role="Client">
      {loading && <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {!loading && !live.length && (
        <div className="card-elevated p-6 text-center">
          <Navigation className="h-6 w-6 text-primary mx-auto" />
          <div className="font-semibold mt-2">No shipments in progress</div>
          <div className="text-sm text-muted-foreground mt-1">Your active deliveries will appear here.</div>
        </div>
      )}

      {open && metrics && (
        <>
          <div className="relative -mx-4 h-[42vh] overflow-hidden">
            <LeafletMap
              className="h-full w-full"
              markers={metrics.current ? [{ id: "veh", lat: metrics.current.lat, lng: metrics.current.lng, color: "#0d3a2c", glyph: "🚛", pulse: true }] : []}
              pickup={metrics.pickup}
              dropoff={metrics.dropoff}
              routeLine={metrics.pickup && metrics.dropoff ? [metrics.pickup, metrics.dropoff] : null}
              fitKey={open.id}
            />
          </div>
          <div className="card-elevated p-4 mt-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold">{open.order_number}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ORDER_STATUS_META[open.status].color}`}>
                {ORDER_STATUS_META[open.status].label}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">ETA {fmtDuration(metrics.etaMinutes)}</span>
            </div>
            <div className="mt-2 text-sm">{open.pickup_address}</div>
            <div className="text-sm text-muted-foreground">→ {open.dropoff_address}</div>
            <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${metrics.progressPct}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              Position shown is {TELEMETRY_META.simulated.label.toLowerCase()} — estimated from the delivery route.
            </div>
          </div>

          <div className="card-elevated p-4 mt-3">
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Delivery timeline</div>
            <OrderTimeline status={open.status} />
          </div>
        </>
      )}

      {live.length > 1 && (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">My shipments</div>
          {live.map((o) => (
            <OrderCardRow key={o.id} order={o} compact selected={open?.id === o.id} onClick={() => setOpenId(o.id)} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

/* ---------------------------------------------------------------- */
/* Driver tracking — own trip                                        */
/* ---------------------------------------------------------------- */

function DriverTracking() {
  const { orders, loading } = useMyOrders("driver");
  const trip = orders.find(isActiveOrder) ?? null;
  const metrics = trip ? routeMetrics(trip, null) : null;

  return (
    <DashboardShell title="My trip" role="Driver">
      {loading && <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
      {!loading && !trip && (
        <div className="card-elevated p-6 text-center">
          <Bell className="h-6 w-6 text-primary mx-auto" />
          <div className="font-semibold mt-2">No active trip</div>
          <div className="text-sm text-muted-foreground mt-1">Assigned trips appear here with navigation.</div>
        </div>
      )}
      {trip && metrics && (
        <>
          <div className="relative -mx-4 h-[45vh] overflow-hidden">
            <LeafletMap
              className="h-full w-full"
              pickup={metrics.pickup}
              dropoff={metrics.dropoff}
              routeLine={metrics.pickup && metrics.dropoff ? [metrics.pickup, metrics.dropoff] : null}
              fitKey={trip.id}
            />
          </div>
          <Link
            to="/dashboard/tracking/$orderId"
            params={{ orderId: trip.id }}
            className="mt-3 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 press"
          >
            <Navigation className="h-4 w-4" /> Open trip controls
          </Link>
          <div className="card-elevated p-4 mt-3">
            <OrderTimeline status={trip.status} />
          </div>
        </>
      )}
    </DashboardShell>
  );
}
