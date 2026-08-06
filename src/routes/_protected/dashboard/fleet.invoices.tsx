import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Search, Receipt } from "lucide-react";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { ListSkeleton } from "@/components/ui/SkeletonList";
import { EmptyState } from "@/components/ui/EmptyState";
import { InvoiceCard } from "@/components/finance/InvoiceCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ksh } from "@/lib/orders-data";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import {
  INVOICE_FILTERS, matchesInvoiceFilter, outstanding,
  type InvoiceFilter, type InvoiceItemRow, type InvoiceRow, type PaymentRow,
} from "@/lib/finance-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/invoices")({
  component: InvoicesList,
});

function InvoicesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [orders, setOrders] = useState<{ id: string; order_number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("all");

  const load = async () => {
    const [{ data: inv }, { data: ord }] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("orders").select("id, order_number").limit(500),
    ]);
    setInvoices((inv as unknown as InvoiceRow[]) ?? []);
    setOrders((ord as unknown as { id: string; order_number: string }[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const orderNumber = (id: string | null) => orders.find((o) => o.id === id)?.order_number ?? null;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return invoices
      .filter((i) => matchesInvoiceFilter(i, filter))
      .filter((i) =>
        !needle ||
        i.invoice_number.toLowerCase().includes(needle) ||
        i.client_name.toLowerCase().includes(needle) ||
        (orderNumber(i.order_id) ?? "").toLowerCase().includes(needle),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, q, filter, orders]);

  const totalOutstanding = invoices.reduce((s, i) => s + outstanding(i), 0);
  const totalBilled = invoices.reduce((s, i) => s + Number(i.total ?? 0), 0);

  async function handleDownload(inv: InvoiceRow) {
    const [{ data: items }, { data: pays }, { data: client }, { data: company }] = await Promise.all([
      supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("sort_order"),
      supabase.from("payments").select("*").eq("invoice_id", inv.id).order("payment_date"),
      inv.client_id
        ? supabase.from("clients").select("name, contact_email, contact_phone, address, tax_number").eq("id", inv.client_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      supabase.from("fleet_companies").select("company_name, contact_email, contact_phone, registration_no, kra_pin").eq("user_id", user!.id).maybeSingle(),
    ]);

    downloadInvoicePdf({
      invoice: inv,
      items: (items as unknown as InvoiceItemRow[]) ?? [],
      payments: (pays as unknown as PaymentRow[]) ?? [],
      company: {
        name: (company as any)?.company_name ?? "LoadLink",
        email: (company as any)?.contact_email,
        phone: (company as any)?.contact_phone,
        registration: (company as any)?.registration_no,
        kra: (company as any)?.kra_pin,
      },
      client: {
        name: (client as any)?.name ?? inv.client_name,
        email: (client as any)?.contact_email,
        phone: (client as any)?.contact_phone,
        address: (client as any)?.address,
        tax_number: (client as any)?.tax_number,
      },
      order: null,
    });
  }

  return (
    <DashboardShell title="Invoices" role="Finance">
      <PullToRefresh onRefresh={load}>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Total billed" value={ksh(totalBilled)} />
          <StatCard label="Outstanding" value={ksh(totalOutstanding)} tone={totalOutstanding ? "warning" : "success"} />
        </div>

        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search invoice, client or order"
            className="w-full h-11 pl-9 pr-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="mt-2.5 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {INVOICE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 h-8 rounded-full text-[11px] font-semibold press ${
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2.5 pb-4">
          {loading ? (
            <ListSkeleton count={4} />
          ) : list.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Create an invoice from a completed order to start billing clients."
              action={
                <button
                  onClick={() => navigate({ to: "/dashboard/fleet/invoices/new" })}
                  className="h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold press"
                >
                  New invoice
                </button>
              }
            />
          ) : (
            list.map((i) => (
              <InvoiceCard
                key={i.id}
                invoice={i}
                orderNumber={orderNumber(i.order_id)}
                onOpen={() => navigate({ to: "/dashboard/fleet/invoices/$invoiceId", params: { invoiceId: i.id } })}
                onRecordPayment={() => navigate({ to: "/dashboard/fleet/payments/new", search: { invoice: i.id } })}
                onDownload={() => handleDownload(i)}
              />
            ))
          )}
        </div>
      </PullToRefresh>

      <button
        onClick={() => navigate({ to: "/dashboard/fleet/invoices/new" })}
        className="fixed bottom-28 right-5 z-40 h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-glow press"
        aria-label="New invoice"
      >
        <Plus className="h-6 w-6" />
      </button>
    </DashboardShell>
  );
}
