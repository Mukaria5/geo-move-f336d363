import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Banknote, Receipt, TrendingUp, Wallet, Activity, RefreshCcw, Plus,
  PieChart, AlertTriangle, ChevronRight, FileText, Fuel,
} from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ListSkeleton } from "@/components/ui/SkeletonList";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ksh } from "@/lib/orders-data";
import {
  FUTURE_FINANCE_INTEGRATIONS, PAYMENT_METHOD_META, financeKpis, monthlyRevenueTrend,
  outstanding, paymentsByMethod, type ExpenseRow, type InvoiceRow, type PaymentRow,
} from "@/lib/finance-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/finance")({
  component: FinanceDashboard,
});

function FinanceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: inv }, { data: pay }, { data: exp }] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("payments").select("*").order("payment_date", { ascending: false }).limit(500),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(500),
    ]);
    setInvoices((inv as unknown as InvoiceRow[]) ?? []);
    setPayments((pay as unknown as PaymentRow[]) ?? []);
    setExpenses((exp as unknown as ExpenseRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("finance-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const kpis = useMemo(() => financeKpis(invoices, payments, expenses), [invoices, payments, expenses]);
  const trend = useMemo(() => monthlyRevenueTrend(payments), [payments]);
  const byMethod = useMemo(() => paymentsByMethod(payments), [payments]);
  const methodMax = byMethod[0]?.value ?? 1;

  const receivables = useMemo(
    () => invoices
      .filter((i) => outstanding(i) > 0 && i.status !== "cancelled" && i.status !== "draft")
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 6),
    [invoices],
  );

  const topPayers = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    for (const p of payments) {
      const key = p.client_id ?? "unknown";
      const inv = invoices.find((i) => i.id === p.invoice_id);
      const name = inv?.client_name || "Walk-in client";
      const cur = map.get(key) ?? { name, value: 0 };
      cur.value += Number(p.amount ?? 0);
      cur.name = cur.name || name;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [payments, invoices]);
  const payerMax = topPayers[0]?.value ?? 1;

  const recent = useMemo(
    () => payments.slice(0, 8),
    [payments],
  );

  const trendMax = Math.max(...trend.map((t) => t.value), 1);

  return (
    <DashboardShell title="Finance" role="Payments & invoicing">
      <PullToRefresh onRefresh={refresh}>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Revenue today" value={ksh(kpis.revenueToday)} tone="success" />
          <StatCard label="Revenue this month" value={ksh(kpis.revenueMonth)} tone="success" />
          <StatCard label="Outstanding" value={ksh(kpis.outstandingTotal)} tone={kpis.outstandingTotal ? "warning" : "default"} sub={`${kpis.outstandingCount} invoice(s)`} />
          <StatCard label="Payments today" value={String(kpis.paymentsToday)} tone="info" />
          <StatCard label="Pending payments" value={String(kpis.pendingPayments)} tone={kpis.pendingPayments ? "warning" : "default"} />
          <StatCard label="Avg invoice value" value={ksh(kpis.avgOrderValue)} />
          <StatCard label="Gross profit" value={ksh(kpis.grossProfit)} sub="Collected − expenses" tone={kpis.grossProfit >= 0 ? "success" : "urgent"} />
          <StatCard label="Collection rate" value={`${kpis.collectionRate}%`} tone="info" />
        </div>

        {/* Quick links */}
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {[
            { to: "/dashboard/fleet/invoices", label: "Invoices", icon: Receipt },
            { to: "/dashboard/fleet/payments/new", label: "Record payment", icon: Banknote },
            { to: "/dashboard/fleet/expenses", label: "Expenses", icon: Fuel },
          ].map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="card-elevated p-3 flex flex-col items-center gap-1.5 press text-center"
            >
              <q.icon className="h-5 w-5 text-primary" />
              <span className="text-[11px] font-semibold">{q.label}</span>
            </Link>
          ))}
        </div>

        {/* Monthly revenue trend */}
        <div className="card-elevated p-4 mt-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div className="text-sm font-display font-semibold">Monthly revenue trend</div>
            <button onClick={refresh} className="ml-auto tap grid place-items-center rounded-full hover:bg-secondary press" aria-label="Refresh">
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="mt-4 flex items-end gap-2 h-24">
            {trend.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(m.value / trendMax) * 100}%` }}
                  transition={{ duration: 0.45 }}
                  className="w-full rounded-t-lg bg-primary/80 min-h-[3px]"
                  title={ksh(m.value)}
                />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payments by method */}
        <div className="card-elevated p-4 mt-3">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            <div className="text-sm font-display font-semibold">Payments by method</div>
          </div>
          {byMethod.length === 0 ? (
            <div className="mt-2 text-xs text-muted-foreground">No payments recorded yet.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {byMethod.map((m) => (
                <div key={m.method}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium">{PAYMENT_METHOD_META[m.method].label}</span>
                    <span className="font-mono text-muted-foreground">{ksh(m.value)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(m.value / methodMax) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outstanding receivables */}
        <div className="card-elevated p-4 mt-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-gold" />
            <div className="text-sm font-display font-semibold">Outstanding receivables</div>
            <Link to="/dashboard/fleet/invoices" className="ml-auto text-[11px] text-primary font-semibold press">
              View all
            </Link>
          </div>
          {loading ? (
            <div className="mt-3"><ListSkeleton count={2} /></div>
          ) : receivables.length === 0 ? (
            <div className="mt-2 text-xs text-muted-foreground">Everything is settled. Nothing outstanding.</div>
          ) : (
            <div className="mt-2.5 space-y-1.5">
              {receivables.map((i) => (
                <button
                  key={i.id}
                  onClick={() => navigate({ to: "/dashboard/fleet/invoices/$invoiceId", params: { invoiceId: i.id } })}
                  className="w-full flex items-center gap-2 rounded-xl bg-secondary/50 p-2.5 press text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">{i.invoice_number} · {i.client_name}</div>
                    <div className="text-[11px] text-muted-foreground">Due {new Date(i.due_date).toLocaleDateString()}</div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold">{ksh(outstanding(i))}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top paying clients */}
        {topPayers.length > 0 && (
          <div className="card-elevated p-4 mt-3">
            <div className="text-sm font-display font-semibold">Top paying clients</div>
            <div className="mt-3 space-y-2">
              {topPayers.map((t) => (
                <div key={t.name}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="truncate font-medium">{t.name}</span>
                    <span className="font-mono text-muted-foreground">{ksh(t.value)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(t.value / payerMax) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent financial activity */}
        <div className="card-elevated p-4 mt-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <div className="text-sm font-display font-semibold">Recent financial activity</div>
          </div>
          {recent.length === 0 ? (
            <div className="mt-2 text-xs text-muted-foreground">Payments you record will appear here.</div>
          ) : (
            <div className="mt-2.5 space-y-1.5 max-h-72 overflow-auto">
              {recent.map((p) => (
                <div key={p.id} className="rounded-xl bg-secondary/50 p-2.5 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold truncate">
                      {ksh(p.amount)} · {PAYMENT_METHOD_META[p.method].label}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {new Date(p.payment_date).toLocaleDateString()}
                      {p.reference_no ? ` · Ref ${p.reference_no}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Future integrations */}
        <div className="card-elevated p-4 mt-3 mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <div className="text-sm font-display font-semibold">Coming to finance</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {FUTURE_FINANCE_INTEGRATIONS.map((f) => (
              <span key={f} className="text-[10px] px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                {f} · soon
              </span>
            ))}
          </div>
        </div>
      </PullToRefresh>

      {/* FAB */}
      <button
        onClick={() => navigate({ to: "/dashboard/fleet/payments/new" })}
        className="fixed bottom-28 right-5 z-40 h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-glow press"
        aria-label="Record payment"
      >
        <Plus className="h-6 w-6" />
      </button>
    </DashboardShell>
  );
}
