import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Banknote, FileDown, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { InvoiceStatusChip } from "@/components/finance/InvoiceCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ksh } from "@/lib/orders-data";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { outstanding, PAYMENT_METHOD_META, type InvoiceItemRow, type InvoiceRow, type PaymentRow } from "@/lib/finance-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/invoices/$invoiceId")({
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [items, setItems] = useState<InvoiceItemRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: inv }, { data: it }, { data: pay }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId).maybeSingle(),
        supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("sort_order"),
        supabase.from("payments").select("*").eq("invoice_id", invoiceId).order("payment_date", { ascending: false }),
      ]);
      setInvoice((inv as unknown as InvoiceRow) ?? null);
      setItems((it as unknown as InvoiceItemRow[]) ?? []);
      setPayments((pay as unknown as PaymentRow[]) ?? []);
      setLoading(false);
    })();
  }, [invoiceId]);

  async function pdf() {
    if (!invoice) return;
    const { data: company } = await supabase
      .from("fleet_companies")
      .select("company_name, contact_email, contact_phone, registration_no, kra_pin")
      .eq("user_id", user!.id).maybeSingle();
    downloadInvoicePdf({
      invoice, items, payments,
      company: {
        name: (company as any)?.company_name ?? "LoadLink",
        email: (company as any)?.contact_email,
        phone: (company as any)?.contact_phone,
        registration: (company as any)?.registration_no,
        kra: (company as any)?.kra_pin,
      },
      client: { name: invoice.client_name },
      order: null,
    });
  }

  if (loading) {
    return (
      <DashboardShell title="Invoice" role="Finance">
        <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      </DashboardShell>
    );
  }
  if (!invoice) {
    return <DashboardShell title="Invoice" role="Finance"><div className="text-sm text-muted-foreground">Invoice not found.</div></DashboardShell>;
  }

  return (
    <DashboardShell title={invoice.invoice_number} role="Finance">
      <div className="card-elevated p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-display font-semibold text-base truncate">{invoice.client_name}</div>
            <div className="text-[11px] text-muted-foreground">
              Issued {new Date(invoice.issue_date).toLocaleDateString()} · Due {new Date(invoice.due_date).toLocaleDateString()}
            </div>
          </div>
          <InvoiceStatusChip invoice={invoice} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-secondary/50 p-2.5">
            <div className="text-[10px] text-muted-foreground">Total</div>
            <div className="text-sm font-bold font-mono">{ksh(invoice.total)}</div>
          </div>
          <div className="rounded-2xl bg-secondary/50 p-2.5">
            <div className="text-[10px] text-muted-foreground">Paid</div>
            <div className="text-sm font-bold font-mono">{ksh(invoice.amount_paid)}</div>
          </div>
          <div className="rounded-2xl bg-secondary/50 p-2.5">
            <div className="text-[10px] text-muted-foreground">Balance</div>
            <div className="text-sm font-bold font-mono text-primary">{ksh(outstanding(invoice))}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={pdf} className="flex-1 h-11 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center justify-center gap-1.5 press">
            <FileDown className="h-4 w-4" /> PDF
          </button>
          <button
            onClick={() => navigate({ to: "/dashboard/fleet/payments/new", search: { invoice: invoice.id } })}
            className="flex-1 h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-glow press"
          >
            <Banknote className="h-4 w-4" /> Record payment
          </button>
        </div>
      </div>

      <div className="card-elevated p-4 mt-3">
        <div className="text-sm font-display font-semibold">Line items</div>
        <div className="mt-2 space-y-1.5">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">{i.description}</div>
                <div className="text-[11px] text-muted-foreground">{i.quantity} × {ksh(i.unit_price)}</div>
              </div>
              <span className="text-xs font-mono font-semibold">{ksh(i.amount)}</span>
            </div>
          ))}
          {items.length === 0 && <div className="text-xs text-muted-foreground">No line items.</div>}
        </div>
      </div>

      <div className="card-elevated p-4 mt-3 mb-4">
        <div className="text-sm font-display font-semibold">Payments</div>
        <div className="mt-2 space-y-1.5">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium">{PAYMENT_METHOD_META[p.method].label}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {new Date(p.payment_date).toLocaleDateString()}{p.reference_no ? ` · ${p.reference_no}` : ""}
                </div>
              </div>
              <span className="text-xs font-mono font-semibold">{ksh(p.amount)}</span>
            </div>
          ))}
          {payments.length === 0 && <div className="text-xs text-muted-foreground">No payments recorded yet.</div>}
        </div>
      </div>
    </DashboardShell>
  );
}
