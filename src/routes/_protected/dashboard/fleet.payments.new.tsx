import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Banknote, Check, Loader2, Receipt, Upload, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ksh } from "@/lib/orders-data";
import { uploadFinanceMedia } from "@/lib/finance-media";
import {
  PAYMENT_METHODS, PAYMENT_METHOD_META, outstanding, paymentNumber,
  type InvoiceRow, type PaymentMethod,
} from "@/lib/finance-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/payments/new")({
  validateSearch: (s: Record<string, unknown>): { invoice?: string } => ({ invoice: (s.invoice as string) || undefined }),
  component: RecordPaymentWizard,
});

const STEPS = [
  { id: 1, label: "Client", icon: Users },
  { id: 2, label: "Invoice", icon: Receipt },
  { id: 3, label: "Amount", icon: Wallet },
  { id: 4, label: "Proof", icon: Upload },
  { id: 5, label: "Review", icon: Check },
  { id: 6, label: "Confirm", icon: Banknote },
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

function RecordPaymentWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [step, setStep] = useState(search.invoice ? 3 : 1);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);

  const [clientId, setClientId] = useState("");
  const [invoiceId, setInvoiceId] = useState(search.invoice ?? "");
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: c }, { data: inv }] = await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase.from("invoices").select("*").order("due_date"),
      ]);
      setClients((c as unknown as { id: string; name: string }[]) ?? []);
      const list = (inv as unknown as InvoiceRow[]) ?? [];
      setInvoices(list);
      if (search.invoice) {
        const found = list.find((i) => i.id === search.invoice);
        if (found) { setClientId(found.client_id ?? ""); setAmount(outstanding(found)); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const invoice = invoices.find((i) => i.id === invoiceId) ?? null;
  const clientInvoices = useMemo(
    () => invoices.filter((i) => (!clientId || i.client_id === clientId) && outstanding(i) > 0),
    [invoices, clientId],
  );

  async function submit() {
    if (!user) return;
    if (amount <= 0) { toast.error("Enter a payment amount"); return; }
    setSaving(true);
    try {
      let proofPath: string | null = null;
      if (proof) proofPath = await uploadFinanceMedia(user.id, proof, "proofs");

      const { count } = await supabase.from("payments").select("id", { count: "exact", head: true });
      const { error } = await supabase.from("payments").insert({
        owner_id: user.id,
        recorded_by: user.id,
        payment_number: paymentNumber((count ?? 0) + 1),
        client_id: clientId || invoice?.client_id || null,
        invoice_id: invoiceId || null,
        order_id: invoice?.order_id ?? null,
        amount,
        method,
        reference_no: reference || null,
        payment_date: date,
        proof_path: proofPath,
        notes: notes || null,
      } as any);
      if (error) throw error;

      toast.success(`Payment of ${ksh(amount)} recorded`);
      if (invoiceId) navigate({ to: "/dashboard/fleet/invoices/$invoiceId", params: { invoiceId } });
      else navigate({ to: "/dashboard/fleet/finance" });
    } catch (e: any) {
      toast.error(e.message ?? "Could not record the payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Record payment" role="Finance">
      <div className="flex items-center gap-1.5">
        {STEPS.map((s) => (
          <div key={s.id} className="flex-1">
            <div className={`h-1.5 rounded-full ${step >= s.id ? "bg-primary" : "bg-secondary"}`} />
            <div className={`mt-1 text-[10px] text-center ${step === s.id ? "text-primary font-semibold" : "text-muted-foreground"}`}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card-elevated p-4 mt-3 space-y-3">
        {step === 1 && (
          <>
            <div className="text-sm font-display font-semibold">Which client is paying?</div>
            <div className="space-y-1.5 max-h-[50vh] overflow-auto">
              {clients.map((c) => (
                <button key={c.id} onClick={() => { setClientId(c.id); setStep(2); }}
                  className={`w-full text-left rounded-2xl p-3 press ${clientId === c.id ? "bg-primary-soft ring-1 ring-primary" : "bg-secondary/50"}`}>
                  <div className="text-sm font-semibold">{c.name}</div>
                </button>
              ))}
              {clients.length === 0 && <div className="text-xs text-muted-foreground">No clients yet.</div>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-sm font-display font-semibold">Apply to invoice</div>
            <div className="space-y-1.5 max-h-[50vh] overflow-auto">
              {clientInvoices.map((i) => (
                <button key={i.id} onClick={() => { setInvoiceId(i.id); setAmount(outstanding(i)); setStep(3); }}
                  className={`w-full text-left rounded-2xl p-3 press ${invoiceId === i.id ? "bg-primary-soft ring-1 ring-primary" : "bg-secondary/50"}`}>
                  <div className="text-sm font-semibold">{i.invoice_number}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Balance {ksh(outstanding(i))} · due {new Date(i.due_date).toLocaleDateString()}
                  </div>
                </button>
              ))}
              {clientInvoices.length === 0 && <div className="text-xs text-muted-foreground">No outstanding invoices for this client.</div>}
            </div>
            <button onClick={() => { setInvoiceId(""); setStep(3); }} className="text-[11px] text-primary font-semibold press">
              Skip — record an unallocated payment
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-sm font-display font-semibold">Amount &amp; method</div>
            {invoice && (
              <div className="rounded-2xl bg-secondary/50 p-3 text-[11px]">
                {invoice.invoice_number} · balance <span className="font-mono font-semibold">{ksh(outstanding(invoice))}</span>
              </div>
            )}
            <Field label="Amount received (KSh)">
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Payment method">
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_META[m].label}</option>)}
              </select>
            </Field>
            <div className="text-[11px] text-muted-foreground">{PAYMENT_METHOD_META[method].hint}</div>
            <Field label="Reference / transaction code">
              <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} placeholder="e.g. QK12ABC456" />
            </Field>
            <Field label="Payment date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
          </>
        )}

        {step === 4 && (
          <>
            <div className="text-sm font-display font-semibold">Proof of payment</div>
            <label className="block rounded-2xl border border-dashed border-border p-6 text-center press cursor-pointer">
              <Upload className="h-5 w-5 mx-auto text-primary" />
              <div className="text-xs mt-2">{proof ? proof.name : "Upload receipt or M-Pesa screenshot"}</div>
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
            </label>
            <Field label="Notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                className="w-full p-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary" />
            </Field>
          </>
        )}

        {(step === 5 || step === 6) && (
          <>
            <div className="text-sm font-display font-semibold">{step === 5 ? "Review" : "Confirm & save"}</div>
            <div className="rounded-2xl bg-secondary/50 p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Client</span><span className="font-semibold">{clients.find((c) => c.id === clientId)?.name ?? invoice?.client_name ?? "Unallocated"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span>{invoice?.invoice_number ?? "None"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span>{PAYMENT_METHOD_META[method].label}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span>{reference || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Proof</span><span>{proof ? proof.name : "None"}</span></div>
              <div className="flex justify-between text-sm pt-1 border-t border-border"><span className="font-semibold">Amount</span><span className="font-mono font-bold text-primary">{ksh(amount)}</span></div>
            </div>
            {step === 6 && (
              <div className="text-[11px] text-muted-foreground">
                Saving updates the invoice balance and the client&apos;s outstanding balance automatically.
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2 mt-3 pb-4">
        <button
          onClick={() => (step === 1 ? navigate({ to: "/dashboard/fleet/finance" }) : setStep(step - 1))}
          className="h-12 px-4 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center gap-1 press"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < 6 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 press">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button onClick={submit} disabled={saving}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-glow press disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
            Save payment
          </button>
        )}
      </div>
    </DashboardShell>
  );
}
