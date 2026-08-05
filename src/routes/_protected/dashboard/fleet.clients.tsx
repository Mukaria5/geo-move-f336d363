import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Users, Plus, Search, AlertTriangle, TrendingUp, Receipt, Activity, ChevronRight,
  ArrowUpDown, CheckSquare, X, Mail, MessageCircle, Sparkles, RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/SkeletonList";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ClientCard } from "@/components/clients/ClientCard";
import { ClientStatusSheet } from "@/components/clients/ClientStatusSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ksh } from "@/lib/orders-data";
import {
  CLIENT_FILTERS, CLIENT_SORTS, CLIENT_STATUS_META, activeOrderCount, clientRevenue,
  crmKpis, matchesClientFilter, needsFollowUp, type ClientFilter, type ClientRow,
  type ClientSort, type CrmOrderLite,
} from "@/lib/crm-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/clients")({
  component: ClientsDashboard,
});

const ORDER_COLS =
  "id, order_number, crm_client_id, status, created_at, estimated_total, final_total, pickup_address, dropoff_address, distance_km, truck_id, driver_id, dropoff_at";

function ClientsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [orders, setOrders] = useState<CrmOrderLite[]>([]);
  const [activity, setActivity] = useState<{ id: string; title: string; detail: string | null; created_at: string; client_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<ClientFilter>("all");
  const [sort, setSort] = useState<ClientSort>("recent");
  const [q, setQ] = useState("");
  const [statusFor, setStatusFor] = useState<ClientRow | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: c } = await supabase
      .from("clients").select("*").order("created_at", { ascending: false });
    const list = (c as ClientRow[]) ?? [];
    setClients(list);

    const ids = list.map((x) => x.id);
    if (ids.length) {
      const [{ data: o }, { data: a }] = await Promise.all([
        supabase.from("orders").select(ORDER_COLS).in("crm_client_id", ids).limit(500),
        supabase.from("client_activity").select("id, title, detail, created_at, client_id")
          .in("client_id", ids).order("created_at", { ascending: false }).limit(12),
      ]);
      setOrders((o as CrmOrderLite[]) ?? []);
      setActivity((a as any[]) ?? []);
    } else {
      setOrders([]);
      setActivity([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("clients-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function pullRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const perClient = useMemo(() => {
    const map = new Map<string, { revenue: number; active: number; total: number; last: string | null }>();
    for (const c of clients) {
      const own = orders.filter((o) => o.crm_client_id === c.id);
      const last = own.length
        ? own.reduce((m, o) => (m > o.created_at ? m : o.created_at), own[0].created_at)
        : c.last_order_at;
      map.set(c.id, {
        revenue: clientRevenue(own),
        active: activeOrderCount(own),
        total: own.length,
        last,
      });
    }
    return map;
  }, [clients, orders]);

  const kpis = useMemo(() => crmKpis(clients, orders), [clients, orders]);

  const trend = useMemo(() => {
    const months: { label: string; n: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      months.push({
        label: d.toLocaleString(undefined, { month: "short" }),
        n: clients.filter((c) => {
          const t = new Date(c.created_at).getTime();
          return t >= start && t < end;
        }).length,
      });
    }
    return months;
  }, [clients]);

  const topClients = useMemo(
    () => [...clients]
      .map((c) => ({ c, revenue: perClient.get(c.id)?.revenue ?? 0 }))
      .filter((x) => x.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5),
    [clients, perClient],
  );
  const topMax = topClients[0]?.revenue ?? 1;

  const followUps = useMemo(
    () => clients
      .map((c) => ({ c, reason: needsFollowUp(c, perClient.get(c.id)?.last ?? null) }))
      .filter((x) => !!x.reason)
      .slice(0, 8),
    [clients, perClient],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = clients.filter((c) => {
      const stats = perClient.get(c.id);
      if (!matchesClientFilter(c, filter, stats?.revenue ?? 0, stats?.last ?? null)) return false;
      if (!needle) return true;
      return [c.name, c.contact_name, c.contact_email, c.contact_phone, c.client_code]
        .some((v) => (v ?? "").toLowerCase().includes(needle));
    });
    return rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "revenue") return (perClient.get(b.id)?.revenue ?? 0) - (perClient.get(a.id)?.revenue ?? 0);
      if (sort === "orders") return (perClient.get(b.id)?.total ?? 0) - (perClient.get(a.id)?.total ?? 0);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [clients, perClient, filter, q, sort]);

  async function bulkStatus(status: ClientRow["status"]) {
    const { error } = await supabase.from("clients").update({ status }).in("id", selected);
    if (error) return toast.error(error.message);
    toast.success(`${selected.length} client(s) updated`);
    setSelected([]);
    setSelectMode(false);
    setBulkOpen(false);
    load();
  }

  return (
    <DashboardShell title="Client management" role="CRM">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Total clients" value={String(kpis.total)} sub="On record" />
        <StatCard label="Active" value={String(kpis.active)} tone="success" sub="Active + preferred" />
        <StatCard label="New this month" value={String(kpis.newThisMonth)} tone="info" />
        <StatCard label="With active orders" value={String(kpis.withActiveOrders)} tone="info" />
        <StatCard label="Outstanding" value={ksh(kpis.outstanding)} tone={kpis.outstanding ? "warning" : "default"} sub="Payments module soon" />
        <StatCard label="Lifetime revenue" value={ksh(kpis.lifetimeRevenue)} tone="success" />
        <StatCard label="Repeat rate" value={`${kpis.repeatRate}%`} sub="Clients with 2+ orders" />
        <StatCard label="Avg order value" value={ksh(kpis.avgOrderValue)} />
      </div>

      {/* New client trend */}
      <div className="card-elevated p-4 mt-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <div className="text-sm font-display font-semibold">New client trend</div>
          <button
            onClick={pullRefresh}
            className="ml-auto tap grid place-items-center rounded-full hover:bg-secondary press"
            aria-label="Refresh"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-4 flex items-end gap-2 h-24">
          {trend.map((m) => {
            const max = Math.max(...trend.map((x) => x.n), 1);
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.n / max) * 100}%` }}
                  transition={{ duration: 0.45 }}
                  className="w-full rounded-t-lg bg-primary/80 min-h-[3px]"
                  title={`${m.n} new`}
                />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue by top clients */}
      {topClients.length > 0 && (
        <div className="card-elevated p-4 mt-3">
          <div className="text-sm font-display font-semibold">Revenue by top clients</div>
          <div className="mt-3 space-y-2">
            {topClients.map(({ c, revenue }) => (
              <button
                key={c.id}
                onClick={() => navigate({ to: "/dashboard/fleet/clients/$clientId", params: { clientId: c.id } })}
                className="w-full text-left press"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="font-mono text-muted-foreground">{ksh(revenue)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(revenue / topMax) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gold"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <div className="card-elevated p-4 mt-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div className="text-sm font-display font-semibold">Recent client activity</div>
          </div>
          <div className="mt-2.5 space-y-1.5 max-h-64 overflow-auto">
            {activity.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate({ to: "/dashboard/fleet/clients/$clientId", params: { clientId: a.client_id } })}
                className="w-full text-left rounded-xl bg-secondary/50 p-2.5 press"
              >
                <div className="text-xs font-semibold truncate">{a.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {new Date(a.created_at).toLocaleString()}{a.detail ? ` · ${a.detail}` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <div className="card-elevated p-4 mt-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gold" />
            <div className="text-sm font-display font-semibold">Clients requiring follow-up</div>
            <span className="ml-auto text-[11px] text-muted-foreground">{followUps.length}</span>
          </div>
          <div className="mt-2.5 space-y-1.5">
            {followUps.map(({ c, reason }) => (
              <button
                key={c.id}
                onClick={() => navigate({ to: "/dashboard/fleet/clients/$clientId", params: { clientId: c.id } })}
                className={`w-full text-left rounded-xl p-2.5 press ${
                  c.status === "suspended" ? "status-urgent" : "status-warning"
                }`}
              >
                <div className="text-xs font-semibold truncate">{c.name}</div>
                <div className="text-[11px] opacity-80">{reason}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Outstanding invoices placeholder */}
      <div className="card-elevated p-4 mt-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <div className="text-sm font-display font-semibold">Outstanding invoices</div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Invoicing arrives with the Payments module. Balances shown here are tracked per client and will
          reconcile automatically once payments are live.
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Email automation", "WhatsApp", "Surveys", "Reminders", "Credit limits", "AI insights"].map((f) => (
            <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-secondary text-muted-foreground">
              {f} · soon
            </span>
          ))}
        </div>
      </div>

      {/* Search + controls */}
      <div className="mt-4 flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, contact, email, phone, code"
            maxLength={80}
            className="w-full h-11 pl-9 pr-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={() => { setSelectMode((v) => !v); setSelected([]); }}
          className={`h-11 w-11 rounded-2xl grid place-items-center press ${
            selectMode ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
          aria-label="Bulk select"
        >
          {selectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {CLIENT_FILTERS.map((f) => (
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
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {CLIENT_SORTS.map((sOpt) => (
          <button
            key={sOpt.key}
            onClick={() => setSort(sOpt.key)}
            className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-semibold press transition ${
              sort === sOpt.key ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"
            }`}
          >
            {sOpt.label}
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
            title={clients.length ? "No clients match" : "No clients yet"}
            description={clients.length
              ? "Try a different filter or search term."
              : "Add your first customer to start building the client directory."}
            action={
              <Link
                to="/dashboard/fleet/clients/new"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow press"
              >
                <Plus className="h-4 w-4" /> Add client
              </Link>
            }
          />
        ) : (
          visible.map((c) => {
            const stats = perClient.get(c.id);
            return (
              <ClientCard
                key={c.id}
                client={c}
                activeOrders={stats?.active ?? 0}
                lastOrder={stats?.last ?? null}
                revenue={stats?.revenue ?? 0}
                selectable={selectMode}
                selected={selected.includes(c.id)}
                onToggleSelect={() =>
                  setSelected((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])}
                onOpen={() => navigate({ to: "/dashboard/fleet/clients/$clientId", params: { clientId: c.id } })}
                onQuickStatus={() => setStatusFor(c)}
                onNewOrder={() => navigate({ to: "/dashboard/orders/new" })}
              />
            );
          })
        )}
      </div>

      {/* Bulk bar */}
      {selectMode && selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-24 z-40 px-4">
          <div className="max-w-md mx-auto glass-strong rounded-2xl p-2.5 flex items-center gap-2 shadow-float">
            <span className="text-xs font-semibold ml-1">{selected.length} selected</span>
            <button
              onClick={() => setBulkOpen(true)}
              className="ml-auto h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold press"
            >
              Bulk actions
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate({ to: "/dashboard/fleet/clients/new" })}
        className="fixed right-5 bottom-28 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-glow press"
        aria-label="Add client"
      >
        <Plus className="h-6 w-6" />
      </button>

      <ClientStatusSheet
        client={statusFor} open={!!statusFor}
        onClose={() => setStatusFor(null)} onChanged={load}
      />

      <BottomSheet open={bulkOpen} onClose={() => setBulkOpen(false)} title={`${selected.length} clients`}>
        <div className="space-y-2 pb-2">
          {(["active", "preferred", "inactive", "suspended"] as ClientRow["status"][]).map((s) => (
            <button
              key={s}
              onClick={() => bulkStatus(s)}
              className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-3 press"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${CLIENT_STATUS_META[s].dot}`} />
              <span className="text-sm font-medium">Mark as {CLIENT_STATUS_META[s].label}</span>
            </button>
          ))}
          <div className="pt-2 text-[11px] text-muted-foreground">Coming with future releases</div>
          {[{ i: Mail, l: "Send bulk email" }, { i: MessageCircle, l: "WhatsApp broadcast" }, { i: Sparkles, l: "AI segment insights" }].map(({ i: Icon, l }) => (
            <div key={l} className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-border p-3 opacity-60">
              <Icon className="h-4 w-4" />
              <span className="text-sm">{l}</span>
              <ChevronRight className="h-4 w-4 ml-auto" />
            </div>
          ))}
        </div>
      </BottomSheet>
    </DashboardShell>
  );
}
