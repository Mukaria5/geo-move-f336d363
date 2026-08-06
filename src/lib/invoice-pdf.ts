import { ksh } from "@/lib/orders-data";
import {
  effectiveStatus, INVOICE_STATUS_META, outstanding,
  type InvoiceItemRow, type InvoiceRow, type PaymentRow,
} from "@/lib/finance-data";

export type InvoicePdfContext = {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
  payments: PaymentRow[];
  company: { name: string; email?: string | null; phone?: string | null; registration?: string | null; kra?: string | null };
  client: { name: string; email?: string | null; phone?: string | null; address?: string | null; tax_number?: string | null };
  order?: {
    order_number: string; pickup_address: string; dropoff_address: string;
    distance_km: number | null; vehicle?: string | null; driver?: string | null;
  } | null;
};

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

/** Renders a branded invoice document and opens the browser print / save-as-PDF dialog. */
export function downloadInvoicePdf(ctx: InvoicePdfContext) {
  const { invoice, items, payments, company, client, order } = ctx;
  const status = INVOICE_STATUS_META[effectiveStatus(invoice)].label;

  const rows = items.length
    ? items.map((i) => `<tr>
        <td>${esc(i.description)}</td>
        <td class="num">${Number(i.quantity)}</td>
        <td class="num">${esc(ksh(i.unit_price))}</td>
        <td class="num">${esc(ksh(i.amount))}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" class="muted">No line items</td></tr>`;

  const payRows = payments.length
    ? payments.map((p) => `<tr>
        <td>${new Date(p.payment_date).toLocaleDateString()}</td>
        <td>${esc(p.method.replace(/_/g, " "))}</td>
        <td>${esc(p.reference_no ?? "—")}</td>
        <td class="num">${esc(ksh(p.amount))}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" class="muted">No payments recorded</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(invoice.invoice_number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "DM Sans", ui-sans-serif, system-ui, sans-serif; color: #10231b; margin: 0; padding: 40px; }
  h1, h2, h3 { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; margin: 0; }
  .brand { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0f6b4f; padding-bottom:16px; }
  .logo { font-size:26px; font-weight:800; color:#0f6b4f; letter-spacing:-0.5px; }
  .tag { font-size:11px; color:#5b6b64; margin-top:2px; }
  .pill { display:inline-block; padding:4px 12px; border-radius:999px; background:#e8f5ef; color:#0f6b4f; font-size:11px; font-weight:700; }
  .grid { display:flex; gap:24px; margin-top:24px; }
  .box { flex:1; background:#f6faf8; border:1px solid #e3ece8; border-radius:14px; padding:14px; }
  .label { font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#5b6b64; }
  .val { font-size:13px; margin-top:2px; }
  table { width:100%; border-collapse:collapse; margin-top:22px; font-size:12.5px; }
  th { text-align:left; background:#0f6b4f; color:#fff; padding:9px 10px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; }
  td { padding:9px 10px; border-bottom:1px solid #e6ece9; }
  .num { text-align:right; font-variant-numeric: tabular-nums; }
  .muted { color:#7a8a83; }
  .totals { margin-left:auto; width:290px; margin-top:16px; font-size:13px; }
  .totals div { display:flex; justify-content:space-between; padding:6px 0; }
  .totals .grand { border-top:2px solid #0f6b4f; margin-top:6px; padding-top:10px; font-weight:800; font-size:16px; color:#0f6b4f; }
  footer { margin-top:34px; font-size:11px; color:#7a8a83; border-top:1px solid #e6ece9; padding-top:12px; }
  @media print { body { padding:16px; } }
</style></head><body>
  <div class="brand">
    <div>
      <div class="logo">${esc(company.name || "LoadLink")}</div>
      <div class="tag">Heavy machinery &amp; low loader logistics · Kenya &amp; East Africa</div>
      <div class="tag">${esc(company.email ?? "")} ${company.phone ? "· " + esc(company.phone) : ""}</div>
      <div class="tag">${company.registration ? "Reg: " + esc(company.registration) : ""} ${company.kra ? "· PIN: " + esc(company.kra) : ""}</div>
    </div>
    <div style="text-align:right">
      <h1 style="font-size:22px">INVOICE</h1>
      <div class="val"><strong>${esc(invoice.invoice_number)}</strong></div>
      <div class="tag">Issued ${new Date(invoice.issue_date).toLocaleDateString()}</div>
      <div class="tag">Due ${new Date(invoice.due_date).toLocaleDateString()}</div>
      <div style="margin-top:6px"><span class="pill">${esc(status)}</span></div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <div class="label">Bill to</div>
      <div class="val"><strong>${esc(client.name)}</strong></div>
      <div class="val">${esc(client.address ?? "")}</div>
      <div class="val">${esc(client.phone ?? "")} ${client.email ? "· " + esc(client.email) : ""}</div>
      <div class="val">${client.tax_number ? "PIN/VAT: " + esc(client.tax_number) : ""}</div>
    </div>
    <div class="box">
      <div class="label">Transport details</div>
      ${order ? `
        <div class="val"><strong>Order ${esc(order.order_number)}</strong></div>
        <div class="val">Pickup: ${esc(order.pickup_address)}</div>
        <div class="val">Delivery: ${esc(order.dropoff_address)}</div>
        <div class="val">Distance: ${order.distance_km ? esc(order.distance_km) + " km" : "—"}</div>
        <div class="val">Vehicle: ${esc(order.vehicle ?? "—")} · Driver: ${esc(order.driver ?? "—")}</div>
      ` : `<div class="val muted">No linked order</div>`}
    </div>
  </div>

  <table>
    <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${esc(ksh(invoice.subtotal))}</span></div>
    <div><span>Discount</span><span>- ${esc(ksh(invoice.discount))}</span></div>
    <div><span>VAT (${Number(invoice.tax_rate)}%)</span><span>${esc(ksh(invoice.tax_amount))}</span></div>
    <div><span>Additional charges</span><span>${esc(ksh(invoice.extra_charges))}</span></div>
    <div class="grand"><span>Total</span><span>${esc(ksh(invoice.total))}</span></div>
    <div><span>Paid</span><span>${esc(ksh(invoice.amount_paid))}</span></div>
    <div><strong>Balance due</strong><strong>${esc(ksh(outstanding(invoice)))}</strong></div>
  </div>

  <h3 style="margin-top:28px; font-size:14px">Payment history</h3>
  <table>
    <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="num">Amount</th></tr></thead>
    <tbody>${payRows}</tbody>
  </table>

  <footer>
    ${invoice.terms ? esc(invoice.terms) + "<br/>" : ""}
    ${invoice.notes ? esc(invoice.notes) + "<br/>" : ""}
    Generated by LoadLink · ${new Date().toLocaleString()}
  </footer>
  <script>window.onload = () => { window.focus(); window.print(); };</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}
