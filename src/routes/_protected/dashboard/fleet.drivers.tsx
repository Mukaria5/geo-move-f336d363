import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Users, Plus, Search, MapPin, AlertTriangle, CalendarClock, Trophy, Star, ChevronRight,
} from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/SkeletonList";
import { DriverCard } from "@/components/drivers/DriverCard";
import { DriverStatusSheet } from "@/components/drivers/DriverStatusSheet";
import { AssignDriverVehicleSheet } from "@/components/drivers/AssignDriverVehicleSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  DRIVER_FILTERS, DRIVER_STATUS_META, DRIVER_STATUSES, buildDriverAlerts, daysUntil,
  driverKpis, matchesDriverFilter, onTimeRate, type DriverFilter, type DriverRow,
} from "@/lib/driver-data-model";

export const Route = createFileRoute("/_protected/dashboard/fleet/drivers")({
  component: DriversDashboard,
});

type VehicleLite = { id: string; plate: string; truck_model: string };
type OrderLite = { id: string; order_number: string; driver_id: string | null; created_at: string };

function DriversDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DriverFilter>("all");
  const [q, setQ] = useState("");
  const [statusFor, setStatusFor] = useState<DriverRow | null>(null);
  const [assignFor, setAssignFor] = useState<DriverRow | null>(null);

  const load = async () => {
    if (!user) return;
    const [{ data: d }, { data: t }] = await Promise.all([
      supabase.from("drivers").select("*").eq("owner_id", user.id).order("full_name"),
      supabase.from("trucks").select("id, plate, truck_model").eq("owner_id", user.id),
    ]);
    const list = (d as DriverRow[]) ?? [];
    setDrivers(list);
    setVehicles((t as VehicleLite[]) ?? []);

    const userIds = list.map((x) => x.user_id).filter(Boolean) as string[];
    if (userIds.length) {
      const { data: o } = await supabase
        .from("orders")
        .select("id, order_number, driver_id, created_at")
        .in("driver_id", userIds)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(200);
      setOrders((o as OrderLite[]) ?? []);
    } else {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("drivers-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const today = new Date().toDateString();
  const tripsToday = orders.filter((o) => new Date(o.created_at).toDateString() === today).length;
  const kpis = useMemo(() => driverKpis(drivers, tripsToday), [drivers, tripsToday]);
  const alerts = useMemo(() => buildDriverAlerts(drivers), [drivers]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return drivers
      .filter((d) => matchesDriverFilter(d.status, filter))
      .filter((d) =>
        !needle ||
        d.full_name.toLowerCase().includes(needle) ||
        (d.employee_id ?? "").toLowerCase().includes(needle) ||
        (d.phone ?? "").toLowerCase().includes(needle) ||
        (d.licence_no ?? "").toLowerCase().includes(needle));
  }, [drivers, filter, q]);

  const leaderboard = useMemo(
    () => [...drivers].sort((a, b) =>
      Number(b.rating) - Number(a.rating) || b.total_trips - a.total_trips).slice(0, 5),
    [drivers],
  );

  const renewals = useMemo(() => {
    const items: { id: string; name: string; label: string; days: number }[] = [];
    for (const d of drivers) {
      const lic = daysUntil(d.licence_expiry);
      if (lic !== null && lic <= 90) items.push({ id: `${d.id}-l`, name: d.full_name, label: "Licence", days: lic });
      const med = daysUntil(d.medical_expiry);
      if (med !== null && med <= 90) items.push({ id: `${d.id}-m`, name: d.full_name, label: "Medical", days: med });
    }
    return items.sort((a, b) => a.days - b.days).slice(0, 6);
  }, [drivers]);

  const chart = useMemo(
    () => DRIVER_STATUSES
      .map((s) => ({ s, n: drivers.filter((d) => d.status === s).length }))
      .filter((x) => x.n > 0),
    [drivers],
  );

  const vehicleLabel = (d: DriverRow) => {
    const v = vehicles.find((x) => x.id === d.assigned_truck_id);
    return v ? `${v.plate}` : null;
  };
  const orderNumber = (d: DriverRow) =>
    orders.find((o) => o.id === d.current_order_id)?.order_number ?? null;

  return (
    <DashboardShell title="Driver management" role="Fleet">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Total" value={String(kpis.total)} sub="Drivers on record" />
        <StatCard label="Available" value={String(kpis.available)} tone="success" sub="Ready to dispatch" />
        <StatCard label="Active" value={String(kpis.onTrip)} tone="info" sub="On a trip now" />
        <StatCard label="Off duty" value={String(kpis.offDuty)} tone="warning" sub="Resting / off shift" />
        <StatCard label="On leave" value={String(kpis.onLeave)} tone="warning" />
        <StatCard label="Expired licences" value={String(kpis.expiredLicence)} tone={kpis.expiredLicence ? "urgent" : "default"} />
        <StatCard label="Avg rating" value={String(kpis.avgRating)} sub="Across rated drivers" />
        <StatCard label="Trips today" value={String(kpis.tripsToday)} tone="info" />
      </div>

      {/* Availability chart */}
      {chart.length > 0 && (
        <div className="card-elevated p-4 mt-3">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">Availability</div>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-secondary">
            {chart.map(({ s, n }) => (
              <motion.div
                key={s}
                initial={{ width: 0 }}
                animate={{ width: `${(n / drivers.length) * 100}%` }}
                transition={{ duration: 0.5 }}
                style={{ background: DRIVER_STATUS_META[s].marker }}
                title={`${DRIVER_STATUS_META[s].label}: ${n}`}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
            {chart.map(({ s, n }) => (
              <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: DRIVER_STATUS_META[s].marker }} />
                {DRIVER_STATUS_META[s].label} · {n}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <Link to="/dashboard/fleet/drivers/map" className="card-elevated p-4 press flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary-soft grid place-items-center">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Driver map</div>
            <div className="text-[11px] text-muted-foreground truncate">Live positions</div>
          </div>
        </Link>
        <Link to="/dashboard/fleet/drivers/new" className="card-elevated p-4 press flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gold/20 grid place-items-center">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Add driver</div>
            <div className="text-[11px] text-muted-foreground truncate">6-step onboarding</div>
          </div>
        </Link>
      </div>

      {/* Attention required */}
      {alerts.length > 0 && (
        <div className="card-elevated p-4 mt-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gold" />
            <div className="text-sm font-display font-semibold">Attention required</div>
            <span className="ml-auto text-[11px] text-muted-foreground">{alerts.length}</span>
          </div>
          <div className="mt-2.5 space-y-1.5 max-h-64 overflow-auto">
            {alerts.slice(0, 8).map((a) => (
              <button
                key={a.id}
                onClick={() => navigate({ to: "/dashboard/fleet/drivers/$driverId", params: { driverId: a.driverId } })}
                className={`w-full text-left rounded-xl p-2.5 press ${a.severity === "urgent" ? "status-urgent" : "status-warning"}`}
              >
                <div className="text-xs font-semibold">{a.title}</div>
                <div className="text-[11px] opacity-80">{a.name} · {a.detail}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard + renewals */}
      {drivers.length > 0 && (
        <div className="grid gap-2.5 mt-3">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-gold" />
              <div className="text-sm font-display font-semibold">Performance leaderboard</div>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {leaderboard.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => navigate({ to: "/dashboard/fleet/drivers/$driverId", params: { driverId: d.id } })}
                  className="w-full flex items-center gap-2.5 rounded-xl bg-secondary/50 p-2.5 press"
                >
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-sm font-medium truncate">{d.full_name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {d.total_trips} trips · {onTimeRate(d)}% on time
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold">
                    <Star className="h-3 w-3 text-gold fill-gold" />
                    {Number(d.rating) > 0 ? Number(d.rating).toFixed(1) : "—"}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          {renewals.length > 0 && (
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <div className="text-sm font-display font-semibold">Upcoming renewals</div>
              </div>
              <div className="mt-2.5 space-y-1.5">
                {renewals.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2.5">
                    <span className="text-sm flex-1 min-w-0 truncate">{r.name}</span>
                    <span className="text-[11px] text-muted-foreground">{r.label}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${r.days < 0 ? "status-urgent" : r.days <= 14 ? "status-warning" : "status-info"}`}>
                      {r.days < 0 ? `${Math.abs(r.days)}d overdue` : `${r.days}d`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + filters */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, ID, phone, licence"
            maxLength={80}
            className="w-full h-11 pl-9 pr-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {DRIVER_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold press transition ${
              filter === f.key ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-3 space-y-2.5">
        {loading ? (
          <ListSkeleton count={4} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={drivers.length ? "No drivers match" : "No drivers yet"}
            description={drivers.length
              ? "Try a different filter or search term."
              : "Onboard your first driver to start dispatching jobs."}
            action={
              <Link
                to="/dashboard/fleet/drivers/new"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow press"
              >
                <Plus className="h-4 w-4" /> Add driver
              </Link>
            }
          />
        ) : (
          visible.map((d) => (
            <DriverCard
              key={d.id}
              driver={d}
              vehicleLabel={vehicleLabel(d)}
              orderNumber={orderNumber(d)}
              onOpen={() => navigate({ to: "/dashboard/fleet/drivers/$driverId", params: { driverId: d.id } })}
              onQuickStatus={() => setStatusFor(d)}
              onAssign={() => setAssignFor(d)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate({ to: "/dashboard/fleet/drivers/new" })}
        className="fixed right-5 bottom-28 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-glow press"
        aria-label="Add driver"
      >
        <Plus className="h-6 w-6" />
      </button>

      <DriverStatusSheet
        driver={statusFor} open={!!statusFor}
        onClose={() => setStatusFor(null)} onChanged={load}
      />
      <AssignDriverVehicleSheet
        driver={assignFor} open={!!assignFor}
        onClose={() => setAssignFor(null)} onAssigned={load}
      />
    </DashboardShell>
  );
}
