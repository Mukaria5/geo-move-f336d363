import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Fuel, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ksh } from "@/lib/orders-data";
import {
  EXPENSE_CATEGORIES, EXPENSE_CATEGORY_META, sameMonth,
  type ExpenseCategory, type ExpenseRow,
} from "@/lib/finance-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/expenses")({
  component: ExpensesPage,
});

const inputCls = "w-full h-11 px-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary";

function ExpensesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ExpenseCategory | "all">("all");

  const [form, setForm] = useState({
    category: "fuel" as ExpenseCategory,
    amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    vendor: "",
    notes: "",
  });

  const load = async () => {
    const { data } = await supabase.from("expenses").select("*").order("expense_date", { ascending: false }).limit(500);
    setRows((data as unknown as ExpenseRow[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { if (user) load(); }, [user]);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows
      .filter((r) => cat === "all" || r.category === cat)
      .filter((r) => !n || (r.vendor ?? "").toLowerCase().includes(n) || (r.notes ?? "").toLowerCase().includes(n));
  }, [rows, q, cat]);

  const monthTotal = rows.filter((r) => sameMonth(r.expense_date)).reduce((s, r) => s + Number(r.amount ?? 0), 0);
  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  async function save() {
    if (!user) return;
    if (form.amount <= 0) { toast.error("Enter an amount"); return; }
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      owner_id: user.id,
      created_by: user.id,
      category: form.category,
      amount: form.amount,
      expense_date: form.expense_date,
      vendor: form.vendor || null,
      notes: form.notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense recorded");
    setOpen(false);
    setForm({ ...form, amount: 0, vendor: "", notes: "" });
    load();
  }

  return (
    <DashboardShell title="Expenses" role="Finance">
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="This month" value={ksh(monthTotal)} tone="warning" />
        <StatCard label="All time" value={ksh(total)} />
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search vendor or note"
        className={`${inputCls} mt-3`}
      />

      <div className="mt-2.5 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(["all", ...EXPENSE_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCat(c as ExpenseCategory | "all")}
            className={`shrink-0 px-3 h-8 rounded-full text-[11px] font-semibold press ${
              cat === c ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {c === "all" ? "All" : EXPENSE_CATEGORY_META[c as ExpenseCategory].label}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-2 pb-4">
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <div className="card-elevated p-6 text-center text-xs text-muted-foreground">No expenses recorded yet.</div>
        ) : (
          list.map((r) => (
            <div key={r.id} className="card-elevated p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary-soft grid place-items-center">
                <Fuel className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{EXPENSE_CATEGORY_META[r.category].label}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {new Date(r.expense_date).toLocaleDateString()}{r.vendor ? ` · ${r.vendor}` : ""}
                </div>
              </div>
              <span className="text-xs font-mono font-semibold">{ksh(r.amount)}</span>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-28 right-5 z-40 h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-glow press"
        aria-label="Add expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Record expense">
        <div className="space-y-3">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })} className={inputCls}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_META[c].label}</option>)}
          </select>
          <input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className={inputCls} placeholder="Amount (KSh)" />
          <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className={inputCls} />
          <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className={inputCls} placeholder="Vendor / station" />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
            className="w-full p-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary" placeholder="Notes" />
          <button onClick={save} disabled={saving}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-glow press disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save expense
          </button>
        </div>
      </BottomSheet>
    </DashboardShell>
  );
}
