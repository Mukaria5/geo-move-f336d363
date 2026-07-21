import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Package, Search, Plus, Loader2, MapPin, Truck as TruckIcon, User as UserIcon,
  Filter, Calendar, DollarSign, MoreVertical,
} from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  ORDER_STATUS_META, type OrderRow, type OrderStatus, ksh,
} from "@/lib/orders-data";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_protected/dashboard/orders")({
  component: OrdersList,
});

type Range = "today" | "week" | "month" | "all";

function inRange(iso: string, r: Range): boolean {
  if (r === "all") return true;
  const d = new Date(iso).getTime();
  const now = new Date();
  const start = new Date(now);
  if (r === "today") start.setHours(0, 0, 0, 0);
  else if (r === "week") { start.setDate(start.getDate() - 7); }
  else if (r === "month") { start.setMonth(start.getMonth() - 1); }
  return d >= start.getTime();
}

function OrdersList() {
  const { user, role } = useAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setRows((data as OrderRow[]) ?? []);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel("orders-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        supabase
          .from("orders")
          .select("*")
          .eq("archived", false)
          .order("created_at", { ascending: false })
          .limit(200)
          .then(({ data }) => setRows((data as OrderRow[]) ?? []));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inRange(r.created_at, range)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!s) return true;
      return (
        r.order_number.toLowerCase().includes(s) ||
        r.client_name.toLowerCase().includes(s) ||
        r.pickup_address.toLowerCase().includes(s) ||
        r.dropoff_address.toLowerCase().includes(s)
      );
    });
  }, [rows, q, range, statusFilter]);

  const stats = useMemo(() => {
    const inR = rows.filter((r) => inRange(r.created_at, range));
    const by = (s: OrderStatus | OrderStatus[]) =>
      inR.filter((r) => (Array.isArray(s) ? s.includes(r.status) : r.status === s)).length;
    const revenue = inR
      .filter((r) => r.status === "completed" || r.status === "delivered")
      .reduce((sum, r) => sum + Number(r.final_total ?? r.estimated_total ?? 0), 0);
    return {
      total: inR.length,
      pending: by(["pending", "confirmed"]),
      assigned: by("assigned"),
      inTransit: by(["en_route_pickup", "arrived_pickup", "loading", "in_transit", "arrived_dropoff"]),
      delivered: by(["delivered", "completed"]),
      cancelled: by("cancelled"),
      revenue,
    };
  }, [rows, range]);

  const canCreate = role === "fleet" || role === "admin" || role === "dispatcher" || role === "client";

  return (
    <DashboardShell title="Orders" role={(role ?? "").toUpperCase()}>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <StatCard label="Total" value={String(stats.total)} tone="info" />
        <StatCard label="Pending" value={String(stats.pending)} tone="warning" />
        <StatCard label="In Transit" value={String(stats.inTransit)} tone="info" />
        <StatCard label="Delivered" value={String(stats.delivered)} tone="success" />
        <StatCard label="Assigned" value={String(stats.assigned)} />
        <StatCard label="Cancelled" value={String(stats.cancelled)} tone="urgent" />
        <div className="col-span-2 card-elevated p-4">
          <div className="inline-flex text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full status-success">
            Revenue
          </div>
          <div className="font-display text-2xl font-bold mt-2 leading-none">{ksh(stats.revenue)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            <DollarSign className="h-3 w-3 inline mr-1" />From delivered / completed
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-3 mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-white/60 px-3 h-10">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order, client, pickup, delivery…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {canCreate && (
            <Link
              to="/dashboard/orders/new"
              className="tap inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 h-10 text-sm font-semibold shadow-soft"
            >
              <Plus className="h-4 w-4" /> New
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["today", "week", "month", "all"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[11px] font-mono uppercase tracking-wider px-3 h-7 rounded-full border transition ${
                range === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-secondary"
              }`}
            >
              <Calendar className="h-3 w-3 inline mr-1" />
              {r === "week" ? "7d" : r === "month" ? "30d" : r}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {(["all", "pending", "assigned", "in_transit", "delivered", "cancelled"] as (OrderStatus | "all")[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-[11px] font-mono uppercase tracking-wider px-3 h-7 rounded-full border transition ${
                statusFilter === s ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"
              }`}
            >
              <Filter className="h-3 w-3 inline mr-1" />
              {s === "all" ? "All" : ORDER_STATUS_META[s as OrderStatus].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
          <div className="text-sm text-muted-foreground">No orders match your filters.</div>
          {canCreate && (
            <Link
              to="/dashboard/orders/new"
              className="inline-flex items-center gap-1.5 mt-3 rounded-xl bg-primary text-primary-foreground px-4 h-10 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Create your first order
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2) }}
            >
              <Link
                to="/dashboard/orders/$orderId"
                params={{ orderId: o.id }}
                className="block card-elevated p-4 hover:shadow-float transition"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {o.order_number}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          ORDER_STATUS_META[o.status].color
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${ORDER_STATUS_META[o.status].dot}`} />
                        {ORDER_STATUS_META[o.status].label}
                      </span>
                    </div>
                    <div className="text-sm font-semibold truncate mt-1">{o.client_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{o.pickup_address} → {o.dropoff_address}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-1 flex items-center gap-2 flex-wrap">
                      {o.cargo_name && <span>{o.cargo_name}</span>}
                      {o.distance_km ? <span>· {Number(o.distance_km).toFixed(1)} km</span> : null}
                      {o.driver_id ? (
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="h-3 w-3" /> assigned
                        </span>
                      ) : null}
                      {o.truck_id ? (
                        <span className="inline-flex items-center gap-1">
                          <TruckIcon className="h-3 w-3" /> truck
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono font-bold">
                      {ksh(o.final_total ?? o.estimated_total ?? 0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(o.created_at).toLocaleDateString()}
                    </div>
                    <MoreVertical className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      {canCreate && (
        <Link
          to="/dashboard/orders/new"
          className="fixed z-30 bottom-24 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-float sm:hidden"
          aria-label="New order"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </Link>
      )}
    </DashboardShell>
  );
}
