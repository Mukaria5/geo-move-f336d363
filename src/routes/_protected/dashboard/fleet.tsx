import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2, Truck, Plus, Loader2, FileText, Eye, Search, Map as MapIcon,
  AlertTriangle, Wrench, Sparkles, X, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/SkeletonList";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { VehicleCard } from "@/components/fleet/VehicleCard";
import { VehicleStatusSheet } from "@/components/fleet/VehicleStatusSheet";
import { AssignVehicleSheet } from "@/components/fleet/AssignVehicleSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  FLEET_FILTERS, VEHICLE_STATUS_META, buildFleetAlerts, matchesFilter, utilization,
  BUSY_STATUSES, type FleetFilter, type VehicleRow,
} from "@/lib/fleet-data";

export const Route = createFileRoute("/_protected/dashboard/fleet")({ component: FleetDashboard });

function DocsPanel() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("documents").select("*").eq("user_id", user.id).order("uploaded_at", { ascending: false })
      .then(({ data }) => { setDocs(data ?? []); setLoading(false); });
  }, [user]);

  const view = async (path: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 600);
    if (error || !data) { toast.error(error?.message ?? "Could not open"); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="card-elevated p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-display font-semibold">Company documents</div>
        <a href="/onboarding/documents" className="text-xs font-semibold text-primary inline-flex items-center gap-1 px-3 h-8 rounded-full bg-primary-soft press">
          <Plus className="h-3 w-3" /> Upload
        </a>
      </div>
      {loading ? (
        <div className="py-8 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <FileText className="h-6 w-6 mx-auto mb-2 opacity-50" />
          No documents uploaded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 p-3">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold capitalize truncate">{String(d.doc_type).replace(/_/g, " ")}</div>
                <div className="text-[11px] text-muted-foreground font-mono truncate">{d.file_path}</div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full ${d.status === "approved" ? "status-success" : d.status === "rejected" ? "status-urgent" : "status-warning"}`}>
                {d.status}
              </span>
              <button onClick={() => view(d.file_path)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-secondary press" title="View">
                <Eye className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FleetChart({ vehicles }: { vehicles: VehicleRow[] }) {
  const buckets = [
    { key: "available", label: "Available", n: vehicles.filter(v => v.status === "available" || v.status === "idle").length, cls: "bg-emerald-500" },
    { key: "on_trip", label: "On trip", n: vehicles.filter(v => BUSY_STATUSES.includes(v.status)).length, cls: "bg-blue-500" },
    { key: "maintenance", label: "Maintenance", n: vehicles.filter(v => v.status === "maintenance" || v.status === "out_of_service").length, cls: "bg-orange-500" },
    { key: "offline", label: "Offline", n: vehicles.filter(v => v.status === "offline").length, cls: "bg-rose-500" },
  ];
  const total = Math.max(vehicles.length, 1);
  return (
    <div className="card-elevated p-4">
      <div className="text-sm font-display font-semibold mb-3">Fleet status</div>
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-secondary">
        {buckets.map((b) => (
          <motion.div
            key={b.key}
            className={b.cls}
            initial={{ width: 0 }}
            animate={{ width: `${(b.n / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 160, damping: 26 }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-y-1.5 mt-3">
        {buckets.map((b) => (
          <div key={b.key} className="flex items-center gap-1.5 text-[11px]">
            <span className={`h-2 w-2 rounded-full ${b.cls}`} />
            <span className="text-muted-foreground">{b.label}</span>
            <span className="font-semibold ml-auto mr-3 font-mono">{b.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FleetDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<any>(null);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FleetFilter>("all");
  const [statusFor, setStatusFor] = useState<VehicleRow | null>(null);
  const [assignFor, setAssignFor] = useState<VehicleRow | null>(null);
  const [selection, setSelection] = useState<string[] | null>(null);

  const refresh = async () => {
    if (!user) return;
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from("fleet_companies").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("trucks").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
    ]);
    setCompany(c);
    const list = (t as VehicleRow[]) ?? [];
    setVehicles(list);

    const driverIds = Array.from(new Set(list.map((v) => v.driver_id).filter(Boolean))) as string[];
    if (driverIds.length) {
      const { data: p } = await supabase.from("profiles").select("id, full_name").in("id", driverIds);
      setDrivers(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.full_name ?? "Driver"])));
    }
    const orderIds = Array.from(new Set(list.map((v) => v.current_order_id).filter(Boolean))) as string[];
    if (orderIds.length) {
      const { data: o } = await supabase.from("orders").select("id, order_number").in("id", orderIds);
      setOrders(Object.fromEntries((o ?? []).map((x: any) => [x.id, x.order_number])));
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const alerts = useMemo(() => buildFleetAlerts(vehicles), [vehicles]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (!matchesFilter(v.status, filter)) return false;
      if (!term) return true;
      const driver = v.driver_id ? drivers[v.driver_id] ?? "" : "";
      return [
        v.plate, v.fleet_number, v.vehicle_type, v.make, v.model, v.truck_model,
        v.branch, VEHICLE_STATUS_META[v.status].label, driver,
      ].filter(Boolean).join(" ").toLowerCase().includes(term);
    });
  }, [vehicles, q, filter, drivers]);

  const kpi = {
    total: vehicles.length,
    available: vehicles.filter((v) => v.status === "available" || v.status === "idle").length,
    onTrip: vehicles.filter((v) => BUSY_STATUSES.includes(v.status)).length,
    maintenance: vehicles.filter((v) => v.status === "maintenance" || v.status === "out_of_service").length,
    offline: vehicles.filter((v) => v.status === "offline").length,
  };

  const upcoming = vehicles
    .filter((v) => v.next_service_date)
    .sort((a, b) => (a.next_service_date! < b.next_service_date! ? -1 : 1))
    .slice(0, 4);

  const recent = vehicles.slice(0, 3);

  return (
    <DashboardShell title={company?.company_name ?? "Fleet"} role="Fleet">
      <PullToRefresh onRefresh={refresh}>
        {/* Hero */}
        <div className="card-premium p-5 mb-4 relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-3 relative">
            <div className="h-12 w-12 rounded-2xl bg-gold/90 text-primary grid place-items-center shrink-0 shadow-gold">
              <Building2 className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl font-bold text-primary-foreground truncate">
                {company?.company_name ?? "Your fleet"}
              </div>
              <div className="text-xs text-primary-foreground/70 mt-0.5">
                {kpi.total} vehicles · {utilization(vehicles)}% utilisation · {company?.verified ? "Verified" : "Pending verification"}
              </div>
            </div>
            <Link
              to="/dashboard/fleet/map"
              className="h-10 px-3 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-semibold inline-flex items-center gap-1.5 press"
            >
              <MapIcon className="h-3.5 w-3.5" /> Map
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          <StatCard label="Total" value={String(kpi.total)} sub="vehicles" tone="info" />
          <StatCard label="Available" value={String(kpi.available)} sub="ready to dispatch" tone="success" />
          <StatCard label="On trip" value={String(kpi.onTrip)} sub="active orders" />
          <StatCard label="Maintenance" value={String(kpi.maintenance)} sub="in workshop" tone="warning" />
          <StatCard label="Offline" value={String(kpi.offline)} sub="not reporting" tone="urgent" />
          <StatCard label="Utilisation" value={`${utilization(vehicles)}%`} sub="fleet in use" tone="info" />
        </div>

        {/* Every module, one tap away */}
        <ModuleGrid title="Workspace" />



        <div className="grid gap-3 mb-4">
          <FleetChart vehicles={vehicles} />

          {/* Attention required */}
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div className="text-sm font-display font-semibold">Attention required</div>
              <span className="ml-auto text-xs text-muted-foreground">{alerts.length}</span>
            </div>
            {alerts.length === 0 ? (
              <div className="text-xs text-muted-foreground py-3 text-center">Everything is compliant and reporting.</div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {alerts.slice(0, 8).map((a) => (
                  <Link
                    key={a.id}
                    to="/dashboard/fleet/vehicles/$vehicleId"
                    params={{ vehicleId: a.truckId }}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 p-2.5 press"
                  >
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.severity === "urgent" ? "status-urgent" : "status-warning"}`}>
                      {a.title}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold font-mono truncate">{a.plate}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{a.detail}</div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming maintenance */}
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-primary" />
              <div className="text-sm font-display font-semibold">Upcoming maintenance</div>
            </div>
            {upcoming.length === 0 ? (
              <div className="text-xs text-muted-foreground py-3 text-center">No scheduled services yet.</div>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((v) => (
                  <Link
                    key={v.id}
                    to="/dashboard/fleet/vehicles/$vehicleId"
                    params={{ vehicleId: v.id }}
                    className="flex items-center gap-2 text-xs rounded-2xl bg-secondary/50 border border-border p-2.5 press"
                  >
                    <span className="font-mono font-semibold">{v.plate}</span>
                    <span className="text-muted-foreground truncate">{v.vehicle_type ?? v.truck_model}</span>
                    <span className="ml-auto font-mono text-muted-foreground">{v.next_service_date}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recently added */}
          {recent.length > 0 && (
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-gold" />
                <div className="text-sm font-display font-semibold">Recently added</div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recent.map((v) => (
                  <Link
                    key={v.id}
                    to="/dashboard/fleet/vehicles/$vehicleId"
                    params={{ vehicleId: v.id }}
                    className="shrink-0 rounded-2xl border border-border bg-secondary/50 p-3 min-w-[9.5rem] press"
                  >
                    <Truck className="h-4 w-4 text-primary mb-1.5" />
                    <div className="text-sm font-semibold font-mono truncate">{v.plate}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{v.vehicle_type ?? v.truck_model}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search + filters */}
        <div className="sticky top-[4.6rem] z-20 -mx-4 px-4 py-2 bg-background/85 backdrop-blur">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Registration, fleet no, driver, type, branch…"
              className="w-full h-11 pl-10 pr-9 rounded-2xl bg-secondary/70 border border-border focus:border-primary focus:bg-card outline-none text-sm transition"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 press" aria-label="Clear search">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {FLEET_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold press transition ${
                  filter === f.key ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selection bar */}
        <AnimatePresence>
          {selection && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground px-3 h-11 my-2"
            >
              <span className="text-xs font-semibold">{selection.length} selected</span>
              <button onClick={() => setSelection(null)} className="ml-auto text-xs font-semibold px-3 h-8 rounded-full bg-primary-foreground/15 press">
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vehicle list */}
        <div className="mt-3 space-y-2">
          {loading ? (
            <ListSkeleton count={4} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={vehicles.length === 0 ? "No vehicles yet" : "No matching vehicles"}
              description={vehicles.length === 0
                ? "Add your first vehicle to start dispatching orders."
                : "Try a different search term or filter."}
              action={vehicles.length === 0 ? (
                <Link to="/dashboard/fleet/new" className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 h-11 text-sm font-semibold shadow-glow press">
                  <Plus className="h-4 w-4" /> Add vehicle
                </Link>
              ) : undefined}
            />
          ) : (
            filtered.map((v) => (
              <VehicleCard
                key={v.id}
                vehicle={v}
                driverName={v.driver_id ? drivers[v.driver_id] : null}
                orderNumber={v.current_order_id ? orders[v.current_order_id] : null}
                onOpen={() => navigate({ to: "/dashboard/fleet/vehicles/$vehicleId", params: { vehicleId: v.id } })}
                onQuickStatus={() => setStatusFor(v)}
                onAssign={() => setAssignFor(v)}
                selectionMode={selection !== null}
                selected={selection?.includes(v.id)}
                onLongPress={() => setSelection((s) => (s ? s : [v.id]))}
                onToggleSelect={() =>
                  setSelection((s) => (s ? (s.includes(v.id) ? s.filter((x) => x !== v.id) : [...s, v.id]) : [v.id]))
                }
              />
            ))
          )}
        </div>

        <DocsPanel />
      </PullToRefresh>

      {/* FAB */}
      <Link
        to="/dashboard/fleet/new"
        className="fixed right-4 z-40 h-14 pl-4 pr-5 rounded-full bg-primary text-primary-foreground shadow-glow inline-flex items-center gap-2 font-semibold text-sm press"
        style={{ bottom: "calc(5.6rem + env(safe-area-inset-bottom))" }}
      >
        <Plus className="h-5 w-5" /> Add Vehicle
      </Link>

      <VehicleStatusSheet vehicle={statusFor} open={!!statusFor} onClose={() => setStatusFor(null)} onChanged={refresh} />
      <AssignVehicleSheet vehicle={assignFor} open={!!assignFor} onClose={() => setAssignFor(null)} onAssigned={refresh} />
    </DashboardShell>
  );
}
