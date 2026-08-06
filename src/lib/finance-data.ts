/** Payments, Invoicing & Finance — shared types, metadata and derived logic. */

export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "bank_transfer" | "mobile_money" | "credit_card" | "cheque" | "other";
export type ExpenseCategory =
  | "fuel" | "maintenance" | "driver_allowance" | "tolls" | "accommodation"
  | "repairs" | "office" | "insurance" | "licences" | "other";

export const INVOICE_STATUS_META: Record<
  InvoiceStatus,
  { label: string; chip: string; dot: string }
> = {
  draft:          { label: "Draft",          chip: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
  sent:           { label: "Sent",           chip: "status-info",    dot: "bg-sky-500" },
  partially_paid: { label: "Partially paid", chip: "status-warning", dot: "bg-amber-500" },
  paid:           { label: "Paid",           chip: "status-success", dot: "bg-emerald-500" },
  overdue:        { label: "Overdue",        chip: "status-urgent",  dot: "bg-rose-500" },
  cancelled:      { label: "Cancelled",      chip: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
};

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft", "sent", "partially_paid", "paid", "overdue", "cancelled",
];

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; hint: string }> = {
  cash:         { label: "Cash",          hint: "Received in cash" },
  bank_transfer:{ label: "Bank transfer", hint: "EFT / RTGS / SWIFT" },
  mobile_money: { label: "Mobile money",  hint: "M-Pesa, Airtel Money" },
  credit_card:  { label: "Credit card",   hint: "Card payment" },
  cheque:       { label: "Cheque",        hint: "Bank cheque" },
  other:        { label: "Other",         hint: "Any other method" },
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  "mobile_money", "bank_transfer", "cash", "credit_card", "cheque", "other",
];

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { label: string }> = {
  fuel:             { label: "Fuel" },
  maintenance:      { label: "Vehicle maintenance" },
  driver_allowance: { label: "Driver allowance" },
  tolls:            { label: "Road tolls" },
  accommodation:    { label: "Accommodation" },
  repairs:          { label: "Repairs" },
  office:           { label: "Office expenses" },
  insurance:        { label: "Insurance" },
  licences:         { label: "Licences" },
  other:            { label: "Other" },
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[];

/** Categories that are allocated against an order when computing profitability. */
export const DIRECT_COST_CATEGORIES: ExpenseCategory[] = [
  "fuel", "driver_allowance", "tolls", "maintenance", "accommodation", "repairs", "other",
];

export const FINANCE_DOC_KINDS: { value: string; label: string }[] = [
  { value: "invoice_pdf", label: "Invoice (PDF)" },
  { value: "receipt", label: "Receipt" },
  { value: "payment_confirmation", label: "Payment confirmation" },
  { value: "credit_note", label: "Credit note" },
  { value: "other", label: "Supporting document" },
];

export type InvoiceRow = {
  id: string;
  owner_id: string;
  invoice_number: string;
  client_id: string | null;
  order_id: string | null;
  client_name: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount: number;
  extra_charges: number;
  total: number;
  amount_paid: number;
  status: InvoiceStatus;
  notes: string | null;
  terms: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceItemRow = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  owner_id: string;
  payment_number: string | null;
  client_id: string | null;
  invoice_id: string | null;
  order_id: string | null;
  amount: number;
  method: PaymentMethod;
  reference_no: string | null;
  payment_date: string;
  proof_path: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseRow = {
  id: string;
  owner_id: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  truck_id: string | null;
  order_id: string | null;
  driver_id: string | null;
  vendor: string | null;
  receipt_path: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceEventRow = {
  id: string;
  invoice_id: string;
  actor_id: string | null;
  kind: string;
  title: string;
  detail: string | null;
  created_at: string;
};

export type FinanceDocumentRow = {
  id: string;
  owner_id: string;
  invoice_id: string | null;
  payment_id: string | null;
  client_id: string | null;
  kind: string;
  label: string | null;
  file_path: string;
  version: number;
  uploaded_by: string | null;
  created_at: string;
};

/* ------------------------------- helpers -------------------------------- */

export function outstanding(inv: Pick<InvoiceRow, "total" | "amount_paid" | "status">): number {
  if (inv.status === "cancelled") return 0;
  return Math.max(0, Number(inv.total ?? 0) - Number(inv.amount_paid ?? 0));
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** Display status derived at read-time so "Overdue"/"Due soon" stay fresh. */
export function effectiveStatus(inv: InvoiceRow): InvoiceStatus {
  if (inv.status === "paid" || inv.status === "cancelled" || inv.status === "draft") return inv.status;
  if (outstanding(inv) <= 0 && Number(inv.total) > 0) return "paid";
  const d = daysUntil(inv.due_date);
  if (d !== null && d < 0) return "overdue";
  if (Number(inv.amount_paid) > 0) return "partially_paid";
  return "sent";
}

export function isDueSoon(inv: InvoiceRow): boolean {
  const d = daysUntil(inv.due_date);
  return effectiveStatus(inv) !== "paid" && d !== null && d >= 0 && d <= 7;
}

export function invoiceTotals(input: {
  subtotal: number; tax_rate: number; discount: number; extra_charges: number;
}) {
  const base = Math.max(0, Number(input.subtotal ?? 0) - Number(input.discount ?? 0));
  const tax = Math.round((base * Number(input.tax_rate ?? 0)) / 100);
  const total = Math.round(base + tax + Number(input.extra_charges ?? 0));
  return { taxable: base, tax_amount: tax, total };
}

export function invoiceNumber(seq: number): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `INV-${ym}-${String(seq).padStart(4, "0")}`;
}

export function paymentNumber(seq: number): string {
  return `PAY-${String(seq).padStart(5, "0")}`;
}

export function sameDay(iso: string, ref = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

export function sameMonth(iso: string, ref = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export type FinanceKpis = {
  revenueToday: number;
  revenueMonth: number;
  outstandingTotal: number;
  outstandingCount: number;
  paymentsToday: number;
  pendingPayments: number;
  avgOrderValue: number;
  grossProfit: number;
  collectionRate: number;
};

export function financeKpis(
  invoices: InvoiceRow[], payments: PaymentRow[], expenses: ExpenseRow[],
): FinanceKpis {
  const live = invoices.filter((i) => i.status !== "cancelled" && i.status !== "draft");
  const invoiced = live.reduce((s, i) => s + Number(i.total ?? 0), 0);
  const collected = live.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const open = live.filter((i) => outstanding(i) > 0);
  const monthPayments = payments.filter((p) => sameMonth(p.payment_date));
  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);

  return {
    revenueToday: payments.filter((p) => sameDay(p.payment_date)).reduce((s, p) => s + Number(p.amount ?? 0), 0),
    revenueMonth: monthPayments.reduce((s, p) => s + Number(p.amount ?? 0), 0),
    outstandingTotal: open.reduce((s, i) => s + outstanding(i), 0),
    outstandingCount: open.length,
    paymentsToday: payments.filter((p) => sameDay(p.payment_date)).length,
    pendingPayments: open.length,
    avgOrderValue: live.length ? Math.round(invoiced / live.length) : 0,
    grossProfit: Math.round(collected - expenseTotal),
    collectionRate: invoiced ? Math.round((collected / invoiced) * 100) : 0,
  };
}

export function monthlyRevenueTrend(payments: PaymentRow[], months = 6) {
  const out: { label: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    out.push({
      label: d.toLocaleString(undefined, { month: "short" }),
      value: payments
        .filter((p) => {
          const t = new Date(p.payment_date).getTime();
          return t >= start && t < end;
        })
        .reduce((s, p) => s + Number(p.amount ?? 0), 0),
    });
  }
  return out;
}

export function paymentsByMethod(payments: PaymentRow[]) {
  const map = new Map<PaymentMethod, number>();
  for (const p of payments) map.set(p.method, (map.get(p.method) ?? 0) + Number(p.amount ?? 0));
  return [...map.entries()]
    .map(([method, value]) => ({ method, value }))
    .sort((a, b) => b.value - a.value);
}

export type OrderProfit = {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  byCategory: { category: ExpenseCategory; amount: number }[];
};

export function orderProfit(revenue: number, expenses: ExpenseRow[]): OrderProfit {
  const byCategory = EXPENSE_CATEGORIES
    .map((category) => ({
      category,
      amount: expenses.filter((e) => e.category === category).reduce((s, e) => s + Number(e.amount ?? 0), 0),
    }))
    .filter((x) => x.amount > 0);
  const costs = byCategory.reduce((s, c) => s + c.amount, 0);
  const profit = Math.round(revenue - costs);
  return {
    revenue: Math.round(revenue),
    costs: Math.round(costs),
    profit,
    margin: revenue ? Math.round((profit / revenue) * 100) : 0,
    byCategory,
  };
}

/** Average days between invoice issue and full settlement. */
export function averagePaymentDays(invoices: InvoiceRow[], payments: PaymentRow[]): number | null {
  const settled = invoices.filter((i) => outstanding(i) <= 0 && Number(i.total) > 0 && i.status !== "cancelled");
  if (!settled.length) return null;
  const spans: number[] = [];
  for (const inv of settled) {
    const last = payments
      .filter((p) => p.invoice_id === inv.id)
      .map((p) => new Date(p.payment_date).getTime())
      .sort((a, b) => b - a)[0];
    if (!last) continue;
    spans.push(Math.max(0, Math.round((last - new Date(inv.issue_date).getTime()) / 86_400_000)));
  }
  if (!spans.length) return null;
  return Math.round(spans.reduce((s, n) => s + n, 0) / spans.length);
}

export type InvoiceFilter = "all" | "open" | "due_soon" | "overdue" | "partially_paid" | "paid" | "draft" | "cancelled";

export const INVOICE_FILTERS: { key: InvoiceFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "due_soon", label: "Due soon" },
  { key: "overdue", label: "Overdue" },
  { key: "partially_paid", label: "Partial" },
  { key: "paid", label: "Paid" },
  { key: "draft", label: "Draft" },
  { key: "cancelled", label: "Cancelled" },
];

export function matchesInvoiceFilter(inv: InvoiceRow, filter: InvoiceFilter): boolean {
  const st = effectiveStatus(inv);
  switch (filter) {
    case "all": return true;
    case "open": return outstanding(inv) > 0 && st !== "cancelled" && st !== "draft";
    case "due_soon": return isDueSoon(inv);
    case "overdue": return st === "overdue";
    case "partially_paid": return st === "partially_paid";
    case "paid": return st === "paid";
    case "draft": return st === "draft";
    case "cancelled": return st === "cancelled";
  }
}

export const CREDIT_STATUS = (outstandingAmount: number, creditLimit: number | null) => {
  if (!creditLimit || creditLimit <= 0) return { label: "No limit set", tone: "default" as const };
  const pct = Math.round((outstandingAmount / creditLimit) * 100);
  if (pct >= 100) return { label: `Over limit · ${pct}%`, tone: "urgent" as const };
  if (pct >= 80) return { label: `Near limit · ${pct}%`, tone: "warning" as const };
  return { label: `Healthy · ${pct}% used`, tone: "success" as const };
};

/** Placeholders for future finance integrations shown across the module. */
export const FUTURE_FINANCE_INTEGRATIONS = [
  "M-Pesa STK Push", "Bank APIs", "Stripe", "PayPal", "Xero", "QuickBooks",
  "Sage", "VAT reporting", "Payment reminders", "Recurring invoices",
];
