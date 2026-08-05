import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Building2, Check, FileText, Loader2, Phone, Users, Wallet, Plus, X, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadClientMedia } from "@/lib/client-media";
import {
  CLIENT_DOC_KINDS, CONTACT_METHODS, CURRENCIES, INDUSTRIES, PAYMENT_METHODS, PAYMENT_TERMS,
  clientCode, paymentTermsLabel, type ClientType,
} from "@/lib/crm-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/clients/new")({
  component: AddClientWizard,
});

const STEPS = [
  { id: 1, label: "Basic", icon: Building2 },
  { id: 2, label: "Contact", icon: Phone },
  { id: 3, label: "Billing", icon: Wallet },
  { id: 4, label: "Contacts", icon: Users },
  { id: 5, label: "Docs", icon: FileText },
  { id: 6, label: "Review", icon: Check },
];

type ExtraContact = {
  name: string; position: string; phone: string; email: string; preferred_method: string;
};
type PendingDoc = { kind: string; label: string; file: File };

function Field({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "w-full h-11 px-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary";

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props;
  return <Field label={label}><input {...rest} className={inputCls} /></Field>;
}

function Select({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function AddClientWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [s, setS] = useState({
    name: "", client_type: "business" as ClientType, industry: "Construction", website: "",
    contact_name: "", contact_phone: "", contact_email: "", address: "", city: "", country: "Kenya",
    tax_number: "", payment_terms: "due_on_receipt", payment_method: "M-Pesa", currency: "KES",
    credit_limit: "0", notes: "",
  });
  const set = (patch: Partial<typeof s>) => setS((p) => ({ ...p, ...patch }));

  const [contacts, setContacts] = useState<ExtraContact[]>([]);
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [docKind, setDocKind] = useState("contract");

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return s.name.trim().length > 1;
      case 2: return s.contact_name.trim().length > 1 && (s.contact_phone.trim().length > 5 || s.contact_email.includes("@"));
      default: return true;
    }
  }, [step, s]);

  function addContact() {
    setContacts((p) => [...p, { name: "", position: "", phone: "", email: "", preferred_method: "phone" }]);
  }
  function patchContact(i: number, patch: Partial<ExtraContact>) {
    setContacts((p) => p.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    const label = CLIENT_DOC_KINDS.find((k) => k.value === docKind)?.label ?? docKind;
    setDocs((p) => [...p, ...Array.from(files).map((file) => ({ kind: docKind, label, file }))]);
  }

  async function submit() {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("clients").insert({
        owner_id: user.id,
        created_by: user.id,
        client_code: clientCode(s.name),
        name: s.name.trim(),
        client_type: s.client_type,
        industry: s.industry || null,
        website: s.website || null,
        contact_name: s.contact_name || null,
        contact_phone: s.contact_phone || null,
        contact_email: s.contact_email || null,
        address: s.address || null,
        city: s.city || null,
        country: s.country || null,
        tax_number: s.tax_number || null,
        payment_terms: s.payment_terms,
        payment_method: s.payment_method,
        currency: s.currency,
        credit_limit: Number(s.credit_limit) || 0,
        notes: s.notes || null,
      }).select("id").single();
      if (error) throw error;
      const clientId = (data as { id: string }).id;

      const valid = contacts.filter((c) => c.name.trim().length > 1);
      if (valid.length) {
        await supabase.from("client_contacts").insert(
          valid.map((c) => ({
            client_id: clientId,
            name: c.name.trim(),
            position: c.position || null,
            phone: c.phone || null,
            email: c.email || null,
            preferred_method: c.preferred_method,
          })),
        );
      }

      for (const d of docs) {
        const path = await uploadClientMedia(user.id, d.file, "docs");
        await supabase.from("client_documents").insert({
          client_id: clientId, uploaded_by: user.id, kind: d.kind, label: d.label, file_path: path,
        });
      }

      await supabase.from("client_activity").insert({
        client_id: clientId, actor_id: user.id, kind: "created",
        title: "Client created", detail: s.name.trim(),
      });

      toast.success("Client created");
      navigate({ to: "/dashboard/fleet/clients/$clientId", params: { clientId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create client");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Add client" role="CRM">
      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((st, i) => {
          const active = step === st.id;
          const done = step > st.id;
          const Icon = st.icon;
          return (
            <div key={st.id} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setStep(st.id)}
                className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-semibold transition press ${
                  active ? "bg-primary text-primary-foreground shadow-soft"
                    : done ? "bg-primary-soft text-primary" : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                {st.label}
              </button>
              {i < STEPS.length - 1 && <div className="h-px w-3 bg-border" />}
            </div>
          );
        })}
      </div>

      <div className="card-elevated p-4 mt-3 space-y-3">
        {step === 1 && (
          <>
            <div className="text-sm font-display font-semibold">Basic information</div>
            <Input label="Company / client name *" value={s.name} maxLength={120}
              onChange={(e) => set({ name: e.target.value })} placeholder="Acme Construction Ltd" />
            <Select
              label="Client type" value={s.client_type}
              onChange={(v) => set({ client_type: v as ClientType })}
              options={[{ value: "business", label: "Business" }, { value: "individual", label: "Individual" }]}
            />
            <Select label="Industry" value={s.industry} onChange={(v) => set({ industry: v })}
              options={INDUSTRIES.map((i) => ({ value: i, label: i }))} />
            <Input label="Website (optional)" value={s.website} maxLength={200}
              onChange={(e) => set({ website: e.target.value })} placeholder="https://acme.co.ke" />
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-sm font-display font-semibold">Contact information</div>
            <Input label="Primary contact *" value={s.contact_name} maxLength={100}
              onChange={(e) => set({ contact_name: e.target.value })} placeholder="Jane Wanjiru" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Phone" value={s.contact_phone} maxLength={30}
                onChange={(e) => set({ contact_phone: e.target.value })} placeholder="+254…" />
              <Input label="Email" type="email" value={s.contact_email} maxLength={255}
                onChange={(e) => set({ contact_email: e.target.value })} placeholder="ops@acme.co.ke" />
            </div>
            <Input label="Address" value={s.address} maxLength={200}
              onChange={(e) => set({ address: e.target.value })} placeholder="Mombasa Road, Industrial Area" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="City" value={s.city} maxLength={80} onChange={(e) => set({ city: e.target.value })} />
              <Input label="Country" value={s.country} maxLength={80} onChange={(e) => set({ country: e.target.value })} />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-sm font-display font-semibold">Billing information</div>
            <Input label="Tax / VAT (PIN) number" value={s.tax_number} maxLength={60}
              onChange={(e) => set({ tax_number: e.target.value })} placeholder="P051234567X" />
            <Select label="Payment terms" value={s.payment_terms} onChange={(v) => set({ payment_terms: v })}
              options={PAYMENT_TERMS} />
            <div className="grid grid-cols-2 gap-2">
              <Select label="Preferred method" value={s.payment_method} onChange={(v) => set({ payment_method: v })}
                options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} />
              <Select label="Currency" value={s.currency} onChange={(v) => set({ currency: v })}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
            </div>
            <Input label="Credit limit (placeholder)" type="number" value={s.credit_limit}
              onChange={(e) => set({ credit_limit: e.target.value })} />
            <div className="text-[11px] text-muted-foreground">
              Invoices and payment history will attach here once the Payments module ships.
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="flex items-center">
              <div className="text-sm font-display font-semibold">Additional contacts</div>
              <button onClick={addContact} className="ml-auto inline-flex items-center gap-1 h-9 px-3 rounded-full bg-secondary text-xs font-semibold press">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
            {contacts.length === 0 && (
              <div className="text-xs text-muted-foreground">
                Optional. Add operations, finance or site contacts for this client.
              </div>
            )}
            {contacts.map((c, i) => (
              <div key={i} className="rounded-2xl border border-border p-3 space-y-2">
                <div className="flex items-center">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    Contact {i + 1}
                  </span>
                  <button
                    onClick={() => setContacts((p) => p.filter((_, idx) => idx !== i))}
                    className="ml-auto tap grid place-items-center rounded-full hover:bg-secondary"
                    aria-label="Remove contact"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Name" value={c.name} maxLength={100} onChange={(e) => patchContact(i, { name: e.target.value })} />
                  <Input label="Position" value={c.position} maxLength={100} onChange={(e) => patchContact(i, { position: e.target.value })} />
                  <Input label="Phone" value={c.phone} maxLength={30} onChange={(e) => patchContact(i, { phone: e.target.value })} />
                  <Input label="Email" value={c.email} maxLength={255} onChange={(e) => patchContact(i, { email: e.target.value })} />
                </div>
                <Select
                  label="Preferred contact method" value={c.preferred_method}
                  onChange={(v) => patchContact(i, { preferred_method: v })}
                  options={CONTACT_METHODS.map((m) => ({ value: m, label: m }))}
                />
              </div>
            ))}
          </>
        )}

        {step === 5 && (
          <>
            <div className="text-sm font-display font-semibold">Documents</div>
            <Select label="Document type" value={docKind} onChange={setDocKind} options={CLIENT_DOC_KINDS} />
            <label className="flex items-center justify-center gap-2 h-24 rounded-2xl border border-dashed border-border cursor-pointer press">
              <Upload className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Tap to attach files</span>
              <input type="file" multiple className="hidden" onChange={(e) => onPickFiles(e.target.files)} />
            </label>
            <div className="space-y-1.5">
              {docs.map((d, i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl bg-secondary/50 p-2.5">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs flex-1 min-w-0 truncate">{d.file.name}</span>
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                  <button onClick={() => setDocs((p) => p.filter((_, idx) => idx !== i))} aria-label="Remove file">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <div className="text-sm font-display font-semibold">Review</div>
            <div className="space-y-1.5 text-sm">
              {[
                ["Name", s.name || "—"],
                ["Type", s.client_type === "business" ? "Business" : "Individual"],
                ["Industry", s.industry || "—"],
                ["Website", s.website || "—"],
                ["Primary contact", s.contact_name || "—"],
                ["Phone", s.contact_phone || "—"],
                ["Email", s.contact_email || "—"],
                ["Address", [s.address, s.city, s.country].filter(Boolean).join(", ") || "—"],
                ["Tax number", s.tax_number || "—"],
                ["Payment terms", paymentTermsLabel(s.payment_terms)],
                ["Method / currency", `${s.payment_method} · ${s.currency}`],
                ["Additional contacts", String(contacts.filter((c) => c.name.trim()).length)],
                ["Documents", String(docs.length)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-start gap-3 border-b border-border/60 pb-1.5">
                  <span className="text-[11px] text-muted-foreground w-32 shrink-0">{k}</span>
                  <span className="flex-1 text-right truncate">{v}</span>
                </div>
              ))}
            </div>
            <Field label="Notes">
              <textarea
                value={s.notes} maxLength={1000} rows={3}
                onChange={(e) => set({ notes: e.target.value })}
                className="w-full p-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary"
                placeholder="Internal notes about this client…"
              />
            </Field>
          </>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => (step > 1 ? setStep(step - 1) : navigate({ to: "/dashboard/fleet/clients" }))}
          className="h-12 px-4 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center gap-2 press"
        >
          <ArrowLeft className="h-4 w-4" /> {step > 1 ? "Back" : "Cancel"}
        </button>
        {step < 6 ? (
          <button
            onClick={() => canNext && setStep(step + 1)}
            disabled={!canNext}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-glow press disabled:opacity-50"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={saving || s.name.trim().length < 2}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-glow press disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Create client
          </button>
        )}
      </div>
    </DashboardShell>
  );
}
