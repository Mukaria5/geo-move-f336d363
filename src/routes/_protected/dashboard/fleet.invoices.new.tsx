import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Loader2, Package, Plus, Receipt, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ksh } from "@/lib/orders-data";
import { invoiceNumber, invoiceTotals } from "@/lib/finance-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/invoices/new")({
  validateSearch: (s: Record<string, unknown>): { order?: string } => ({ order: (s.order as string) || undefined }),
  component: NewInvoiceWizard,
});

const STEPS = [
  { id: 1, label: "Client", icon: Users },
  { id: 2, label: "Order", icon: Package },
  { id: 3, label: "Items", icon: Receipt },
  { id: 4, label: "Totals", icon: Wallet },
  { id: 5, label: "Review", icon: Check },
];

const inputCls = "w-full h-11 px-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

type Item = { description: string; quantity: number; unit_price: number };
type ClientLite = { id: string; name: string; payment_terms: string | null; contact_email: string | null };
type OrderLite = {
  id: string; order_number: string; crm_client_id: string | null; client_name: string;
  pickup_address: string; dropoff_address: string; distance_km: number | null;
  estimated_total: number | null; final_total: number | null; status: string;
};

function addDays(d: number) {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
}

function NewInvoiceWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [orders, setOrders] = useState<OrderLite[]>([]);

  const [clientId, setClientId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [orderId, setOrderId] = useState<string>(search.order ?? "");
  const [items, setItems] = useState<Item[]>([{ description: "Heavy machinery transport", quantity: 1, unit_price: 0 }]);
  const [taxRate, setTaxRate] = useState(16);
  const [discount, setDiscount] = useState(0);
  const [extra, setExtra] = useState(0);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(addDays(30));
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within the agreed credit terms. M-Pesa and bank transfer accepted.");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from("clients").select("id, name, payment_terms, contact_email").order("name"),
        supabase.from("orders").select("id, order_number, crm_client_id, client_name, pickup_address, dropoff_address, distance_km, estimated_total, final_total, status")
          .order("created_at", { ascending: false }).limit(200),
      ]);
      setClients((c as unknown as ClientLite[]) ?? []);
      setOrders((o as unknown as OrderLite[]) ?? []);
    })();
  }, [user]);

  const selectedOrder = orders.find((o) => o.id === orderId) ?? null;
  const clientOrders = useMemo(
    () => orders.filter((o) => !clientId || o.crm_client_id === clientId),
    [orders, clientId],
  );

  function pickClient(c: ClientLite) {
    setClientId(c.id);
    setClientName(c.name);
    if (c.payment_terms?.startsWith("net_")) setDueDate(addDays(Number(c.payment_terms.replace("net_", "")) || 30));
    setStep(2);
  }

  function pickOrder(o: OrderLite) {
    setOrderId(o.id);
    if (!clientName) setClientName(o.client_name);
    const value = Number(o.final_total ?? o.estimated_total ?? 0);
    setItems([
      {
        description: `Transport ${o.order_number}: ${o.pickup_address} → ${o.dropoff_address}${o.distance_km ? ` (${o.distance_km} km)` : ""}`,
        quantity: 1,
        unit_price: value,
      },
    ]);
    setStep(3);
  }

  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
  const totals = invoiceTotals({ subtotal, tax_rate: taxRate, discount, extra_charges: extra });

  async function submit() {
    if (!user) return;
    if (!clientName.trim()) { toast.error("Choose a client first"); return; }
    setSaving(true);
    try {
      const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true });
      const number = invoiceNumber((count ?? 0) + 1);

      const { data: inv, error } = await supabase
        .from("invoices")
        .insert({
          owner_id: user.id,
          created_by: user.id,
          invoice_number: number,
          client_id: clientId || null,
          order_id: orderId || null,
          client_name: clientName,
          issue_date: issueDate,
          due_date: dueDate,
          subtotal,
          tax_rate: taxRate,
          tax_amount: totals.tax_amount,
          discount,
          extra_charges: extra,
          total: totals.total,
          status: "sent",
          notes: notes || null,
          terms: terms || null,
          sent_at: new Date().toISOString(),
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      const rows = items
        .filter((i) => i.description.trim())
        .map((i, idx) => ({
          invoice_id: (inv as any).id,
          description: i.description,
          quantity: Number(i.quantity || 0),
          unit_price: Number(i.unit_price || 0),
          amount: Number(i.quantity || 0) * Number(i.unit_price || 0),
          sort_order: idx,
        }));
      if (rows.length) {
        const { error: e2 } = await supabase.from("invoice_items").insert(rows as any);
        if (e2) throw e2;
      }

      toast.success(`Invoice ${number} created`);
      navigate({ to: "/dashboard/fleet/invoices/$invoiceId", params: { invoiceId: (inv as any).id } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not create the invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="New invoice" role="Finance">
      {/* progress */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((s) => (
          <div key={s.id} className="flex-1">
            <div className={`h-1.5 rounded-full ${step >= s.id ? "bg-primary" : "bg-secondary"}`} />
            <div className={`mt-1 text-[10px] text-center ${step === s.id ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="card-elevated p-4 mt-3 space-y-3">
        {step === 1 && (
          <>
            <div className="text-sm font-display font-semibold">Who are you billing?</div>
            <div className="space-y-1.5 max-h-[50vh] overflow-auto">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickClient(c)}
                  className={`w-full text-left rounded-2xl p-3 press ${clientId === c.id ? "bg-primary-soft ring-1 ring-primary" : "bg-secondary/50"}`}
                >
                  <div className="text-sm font-semibold">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.contact_email ?? "No email on file"}</div>
                </button>
              ))}
              {clients.length === 0 && (
                <div className="text-xs text-muted-foreground">No clients yet — add one in Client management first.</div>
              )}
            </div>
            <Field label="Or bill a one-off client">
              <input value={clientName} onChange={(e) => { setClientName(e.target.value); setClientId(""); }} className={inputCls} placeholder="Client name" />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-sm font-display font-semibold">Link an order (optional)</div>
            <div className="space-y-1.5 max-h-[50vh] overflow-auto">
              {clientOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => pickOrder(o)}
                  className={`w-full text-left rounded-2xl p-3 press ${orderId === o.id ? "bg-primary-soft ring-1 ring-primary" : "bg-secondary/50"}`}
                >
                  <div className="text-sm font-semibold">{o.order_number} · {ksh(o.final_total ?? o.estimated_total)}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{o.pickup_address} → {o.dropoff_address}</div>
                </button>
              ))}
              {clientOrders.length === 0 && <div className="text-xs text-muted-foreground">No orders found for this client.</div>}
            </div>
            <button onClick={() => { setOrderId(""); setStep(3); }} className="text-[11px] text-primary font-semibold press">
              Skip — invoice without an order
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-sm font-display font-semibold">Line items</div>
            {items.map((it, idx) => (
              <div key={idx} className="rounded-2xl bg-secondary/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Item {idx + 1}</span>
                  {items.length > 1 && (
                    <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="ml-auto press" aria-label="Remove item">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <input
                  value={it.description}
                  onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                  className={inputCls}
                  placeholder="Description"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Qty">
                    <input type="number" min={0} value={it.quantity}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))}
                      className={inputCls} />
                  </Field>
                  <Field label="Unit price (KSh)">
                    <input type="number" min={0} value={it.unit_price}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))}
                      className={inputCls} />
                  </Field>
                </div>
                <div className="text-[11px] text-muted-foreground text-right font-mono">
                  {ksh(Number(it.quantity || 0) * Number(it.unit_price || 0))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0 }])}
              className="inline-flex items-center gap-1 text-[11px] text-primary font-semibold press"
            >
              <Plus className="h-3.5 w-3.5" /> Add item
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <div className="text-sm font-display font-semibold">Taxes, dates &amp; terms</div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="VAT rate (%)">
                <input type="number" min={0} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Discount (KSh)">
                <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Extra charges (KSh)">
                <input type="number" min={0} value={extra} onChange={(e) => setExtra(Number(e.target.value))} className={inputCls} />
              </Field>
              <Field label="Issue date">
                <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Due date">
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Terms">
              <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2}
                className="w-full p-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary" />
            </Field>
            <Field label="Notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full p-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary" />
            </Field>
          </>
        )}

        {step === 5 && (
          <>
            <div className="text-sm font-display font-semibold">Review</div>
            <div className="rounded-2xl bg-secondary/50 p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-semibold">{clientName || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Order</span><span>{selectedOrder?.order_number ?? "None"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Issued / due</span><span>{issueDate} → {dueDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{ksh(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VAT {taxRate}%</span><span className="font-mono">{ksh(totals.tax_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono">- {ksh(discount)}</span></div>
              <div className="flex justify-between text-sm pt-1 border-t border-border"><span className="font-semibold">Total</span><span className="font-mono font-bold text-primary">{ksh(totals.total)}</span></div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 mt-3 pb-4">
        <button
          onClick={() => (step === 1 ? navigate({ to: "/dashboard/fleet/invoices" }) : setStep(step - 1))}
          className="h-12 px-4 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center gap-1 press"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < 5 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 press"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-glow press disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Create invoice
          </button>
        )}
      </div>
    </DashboardShell>
  );
}
