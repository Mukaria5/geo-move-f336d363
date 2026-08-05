import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft, Building2, Package, Wallet, Users, FileText, Activity, StickyNote,
  Phone, Mail, Globe, MapPin, Plus, Upload, Loader2, Download, Eye, Trash2, Pencil,
  Sparkles, Bell, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ListSkeleton } from "@/components/ui/SkeletonList";
import { EmptyState } from "@/components/ui/EmptyState";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ClientAvatar, ClientStatusChip } from "@/components/clients/ClientCard";
import { ClientStatusSheet } from "@/components/clients/ClientStatusSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { downloadClientMedia, openClientMedia, uploadClientMedia } from "@/lib/client-media";
import { ksh, ORDER_STATUS_META, type OrderStatus } from "@/lib/orders-data";
import {
  CLIENT_DOC_KINDS, CONTACT_METHODS, activeOrderCount, clientRevenue, isEarned, orderValue,
  paymentTermsLabel, type ClientActivityRow, type ClientContactRow, type ClientDocumentRow,
  type ClientNoteRow, type ClientRow, type CrmOrderLite,
} from "@/lib/crm-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/clients/$clientId")({
  component: ClientProfile,
});

const ORDER_COLS =
  "id, order_number, crm_client_id, status, created_at, estimated_total, final_total, pickup_address, dropoff_address, distance_km, truck_id, driver_id, dropoff_at";

type Tab = "overview" | "orders" | "financial" | "contacts" | "documents" | "timeline" | "notes";
const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "orders", label: "Orders", icon: Package },
  { key: "financial", label: "Financial", icon: Wallet },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "timeline", label: "Timeline", icon: Activity },
  { key: "notes", label: "Notes", icon: StickyNote },
];

const inputCls =
  "w-full h-11 px-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 py-2">
      <span className="text-[11px] text-muted-foreground w-32 shrink-0">{k}</span>
      <span className="flex-1 text-sm text-right break-words">{v ?? "—"}</span>
    </div>
  );
}

function ClientProfile() {
  const { clientId } = useParams({ from: "/_protected/dashboard/fleet/clients/$clientId" });
  const { user } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientRow | null>(null);
  const [orders, setOrders] = useState<CrmOrderLite[]>([]);
  const [contacts, setContacts] = useState<ClientContactRow[]>([]);
  const [docs, setDocs] = useState<ClientDocumentRow[]>([]);
  const [notes, setNotes] = useState<ClientNoteRow[]>([]);
  const [timeline, setTimeline] = useState<ClientActivityRow[]>([]);
  const [trucks, setTrucks] = useState<{ id: string; plate: string }[]>([]);
  const [drivers, setDrivers] = useState<{ user_id: string | null; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [statusOpen, setStatusOpen] = useState(false);

  const [contactSheet, setContactSheet] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", position: "", phone: "", email: "", preferred_method: "phone" });
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNote, setEditingNote] = useState<ClientNoteRow | null>(null);
  const [docKind, setDocKind] = useState("contract");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: o }, { data: ct }, { data: d }, { data: n }, { data: a }] = await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("orders").select(ORDER_COLS).eq("crm_client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_contacts").select("*").eq("client_id", clientId).order("created_at"),
      supabase.from("client_documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_notes").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_activity").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(50),
    ]);
    setClient((c as ClientRow) ?? null);
    setOrders((o as CrmOrderLite[]) ?? []);
    setContacts((ct as ClientContactRow[]) ?? []);
    setDocs((d as ClientDocumentRow[]) ?? []);
    setNotes((n as ClientNoteRow[]) ?? []);
    setTimeline((a as ClientActivityRow[]) ?? []);

    const [{ data: t }, { data: dr }] = await Promise.all([
      supabase.from("trucks").select("id, plate"),
      supabase.from("drivers").select("user_id, full_name"),
    ]);
    setTrucks((t as any[]) ?? []);
    setDrivers((dr as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clientId]);

  const revenue = useMemo(() => clientRevenue(orders), [orders]);
  const earnedCount = orders.filter(isEarned).length;
  const avgValue = earnedCount ? Math.round(revenue / earnedCount) : 0;

  async function logActivity(kind: string, title: string, detail?: string) {
    await supabase.from("client_activity").insert({
      client_id: clientId, actor_id: user?.id ?? null, kind, title, detail: detail ?? null,
    });
  }

  async function addContact() {
    if (newContact.name.trim().length < 2) return toast.error("Contact name required");
    const { error } = await supabase.from("client_contacts").insert({
      client_id: clientId,
      name: newContact.name.trim(),
      position: newContact.position || null,
      phone: newContact.phone || null,
      email: newContact.email || null,
      preferred_method: newContact.preferred_method,
    });
    if (error) return toast.error(error.message);
    await logActivity("contact", "Contact added", newContact.name.trim());
    setNewContact({ name: "", position: "", phone: "", email: "", preferred_method: "phone" });
    setContactSheet(false);
    toast.success("Contact added");
    load();
  }

  async function removeContact(id: string, name: string) {
    await supabase.from("client_contacts").delete().eq("id", id);
    await logActivity("contact", "Contact removed", name);
    load();
  }

  async function uploadDoc(files: FileList | null, replaceOf?: ClientDocumentRow) {
    if (!files?.length || !user) return;
    setUploading(true);
    try {
      const file = files[0];
      const path = await uploadClientMedia(user.id, file, "docs");
      const kind = replaceOf?.kind ?? docKind;
      const label = replaceOf?.label ?? CLIENT_DOC_KINDS.find((k) => k.value === kind)?.label ?? kind;
      const { error } = await supabase.from("client_documents").insert({
        client_id: clientId, uploaded_by: user.id, kind, label, file_path: path,
        version: replaceOf ? replaceOf.version + 1 : 1,
      });
      if (error) throw error;
      await logActivity("document", replaceOf ? `Document replaced · ${label}` : `Document uploaded · ${label}`, file.name);
      toast.success(replaceOf ? "New version uploaded" : "Document uploaded");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function saveNote() {
    if (noteDraft.trim().length < 2 || !user) return;
    if (editingNote) {
      const { error } = await supabase.from("client_notes").update({
        body: noteDraft.trim(), edited_at: new Date().toISOString(), edit_count: editingNote.edit_count + 1,
      }).eq("id", editingNote.id);
      if (error) return toast.error(error.message);
      await logActivity("note", "Note edited");
    } else {
      const { error } = await supabase.from("client_notes").insert({
        client_id: clientId, author_id: user.id, body: noteDraft.trim(),
      });
      if (error) return toast.error(error.message);
      await logActivity("note", "Note added");
    }
    setNoteDraft("");
    setEditingNote(null);
    load();
  }

  if (loading) {
    return (
      <DashboardShell title="Client" role="CRM">
        <ListSkeleton count={5} />
      </DashboardShell>
    );
  }

  if (!client) {
    return (
      <DashboardShell title="Client" role="CRM">
        <EmptyState icon={Building2} title="Client not found" description="This client may have been removed." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={client.name} role="CRM">
      <button
        onClick={() => navigate({ to: "/dashboard/fleet/clients" })}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground press mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All clients
      </button>

      {/* Header card */}
      <div className="card-premium p-4">
        <div className="flex gap-3 items-center">
          <ClientAvatar client={client} size={64} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg font-bold truncate text-primary-foreground">{client.name}</div>
            <div className="text-[11px] text-primary-foreground/70 truncate">
              {client.client_code ?? "—"} · {client.industry ?? (client.client_type === "individual" ? "Individual" : "Business")}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <ClientStatusChip status={client.status} />
              <button
                onClick={() => setStatusOpen(true)}
                className="text-[11px] font-semibold rounded-full bg-gold text-primary px-3 h-7 press"
              >
                Change status
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { k: "Revenue", v: ksh(revenue) },
            { k: "Orders", v: String(orders.length) },
            { k: "Active", v: String(activeOrderCount(orders)) },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl bg-primary-foreground/10 p-2.5">
              <div className="text-[10px] uppercase tracking-widest text-primary-foreground/60">{x.k}</div>
              <div className="font-display font-bold text-primary-foreground text-sm mt-0.5">{x.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold press transition ${
              tab === t.key ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === "overview" && (
          <div className="card-elevated p-4">
            <Row k="Company" v={client.name} />
            <Row k="Contact person" v={client.contact_name} />
            <Row k="Phone" v={client.contact_phone
              ? <a href={`tel:${client.contact_phone}`} className="text-primary inline-flex items-center gap-1"><Phone className="h-3 w-3" />{client.contact_phone}</a>
              : "—"} />
            <Row k="Email" v={client.contact_email
              ? <a href={`mailto:${client.contact_email}`} className="text-primary inline-flex items-center gap-1"><Mail className="h-3 w-3" />{client.contact_email}</a>
              : "—"} />
            <Row k="Website" v={client.website
              ? <a href={client.website} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1"><Globe className="h-3 w-3" />{client.website}</a>
              : "—"} />
            <Row k="Address" v={[client.address, client.city, client.country].filter(Boolean).join(", ") || "—"} />
            <Row k="Tax / VAT" v={client.tax_number} />
            <Row k="Industry" v={client.industry} />
            <Row k="Payment terms" v={paymentTermsLabel(client.payment_terms)} />
            <Row k="Preferred method" v={client.payment_method} />
            <Row k="Currency" v={client.currency} />
            <Row k="Customer since" v={new Date(client.customer_since).toLocaleDateString()} />
            <Row k="Notes" v={client.notes || "—"} />

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { i: Bell, l: "Reminders" },
                { i: ShieldCheck, l: "Credit limit" },
                { i: Sparkles, l: "AI insights" },
              ].map(({ i: Icon, l }) => (
                <div key={l} className="rounded-2xl border border-dashed border-border p-3 text-center opacity-60">
                  <Icon className="h-4 w-4 mx-auto text-primary" />
                  <div className="text-[10px] mt-1">{l}</div>
                  <div className="text-[9px] text-muted-foreground">soon</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "orders" && (
          orders.length === 0 ? (
            <EmptyState
              icon={Package} title="No orders yet"
              description="Orders created for this client will appear here automatically."
              action={
                <button
                  onClick={() => navigate({ to: "/dashboard/orders/new" })}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold shadow-glow press"
                >
                  <Plus className="h-4 w-4" /> New order
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {orders.map((o) => {
                const meta = ORDER_STATUS_META[o.status as OrderStatus];
                const truck = trucks.find((t) => t.id === o.truck_id)?.plate;
                const driver = drivers.find((d) => d.user_id === o.driver_id)?.full_name;
                return (
                  <button
                    key={o.id}
                    onClick={() => navigate({ to: "/dashboard/orders/$orderId", params: { orderId: o.id } })}
                    className="w-full text-left card-elevated p-3.5 press"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">{o.order_number}</span>
                      {meta && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                      )}
                      <span className="ml-auto text-sm font-mono font-bold">{ksh(orderValue(o))}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{o.pickup_address} → {o.dropoff_address}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground font-mono flex flex-wrap gap-x-2">
                      {o.distance_km ? <span>{Number(o.distance_km).toFixed(1)} km</span> : null}
                      <span>· {truck ?? "No vehicle"}</span>
                      <span>· {driver ?? "No driver"}</span>
                      <span>· {o.dropoff_at ? new Date(o.dropoff_at).toLocaleDateString() : new Date(o.created_at).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}

        {tab === "financial" && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { l: "Total revenue", v: ksh(revenue) },
                { l: "Outstanding", v: ksh(Number(client.outstanding_balance ?? 0)) },
                { l: "Paid invoices", v: "—" },
                { l: "Pending invoices", v: "—" },
                { l: "Avg order value", v: ksh(avgValue) },
                { l: "Credit limit", v: ksh(Number(client.credit_limit ?? 0)) },
              ].map((x) => (
                <div key={x.l} className="card-elevated p-4">
                  <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{x.l}</div>
                  <div className="font-display text-xl font-bold mt-2 leading-none">{x.v}</div>
                </div>
              ))}
            </div>
            <div className="card-elevated p-4">
              <div className="text-sm font-display font-semibold">Invoices &amp; payments</div>
              <div className="text-xs text-muted-foreground mt-1">
                This section is wired for the upcoming Payments module — invoices, receipts and payment
                history for {client.name} will land here without further setup.
              </div>
            </div>
          </div>
        )}

        {tab === "contacts" && (
          <div className="space-y-2">
            <button
              onClick={() => setContactSheet(true)}
              className="w-full h-11 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center justify-center gap-2 press"
            >
              <Plus className="h-4 w-4" /> Add contact
            </button>
            {contacts.length === 0 ? (
              <EmptyState icon={Users} title="No additional contacts" description="Add operations, finance or site contacts." />
            ) : contacts.map((c) => (
              <div key={c.id} className="card-elevated p-3.5">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.position ?? "—"}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary">{c.preferred_method}</span>
                  <button onClick={() => removeContact(c.id, c.name)} aria-label="Remove contact" className="tap grid place-items-center">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                  {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "documents" && (
          <div className="space-y-2">
            <div className="card-elevated p-3.5 space-y-2">
              <select value={docKind} onChange={(e) => setDocKind(e.target.value)} className={inputCls}>
                {CLIENT_DOC_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <label className="flex items-center justify-center gap-2 h-20 rounded-2xl border border-dashed border-border cursor-pointer press">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-primary" />}
                <span className="text-xs text-muted-foreground">Upload document</span>
                <input type="file" className="hidden" onChange={(e) => uploadDoc(e.target.files)} />
              </label>
            </div>
            {docs.length === 0 ? (
              <EmptyState icon={FileText} title="No documents" description="Contracts, SLAs and certificates are stored securely here." />
            ) : docs.map((d) => (
              <div key={d.id} className="card-elevated p-3.5 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{d.label ?? d.kind}</div>
                  <div className="text-[11px] text-muted-foreground">
                    v{d.version} · {new Date(d.created_at).toLocaleDateString()}
                    {d.expires_on ? ` · expires ${new Date(d.expires_on).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <button onClick={() => openClientMedia(d.file_path)} aria-label="Preview" className="tap grid place-items-center">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  onClick={() => downloadClientMedia(d.file_path, `${d.label ?? d.kind}-v${d.version}`)}
                  aria-label="Download" className="tap grid place-items-center"
                >
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
                <label className="tap grid place-items-center cursor-pointer" aria-label="Replace version">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <input type="file" className="hidden" onChange={(e) => uploadDoc(e.target.files, d)} />
                </label>
              </div>
            ))}
          </div>
        )}

        {tab === "timeline" && (
          timeline.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" description="Client events will be recorded here." />
          ) : (
            <div className="card-elevated p-4">
              <div className="space-y-3">
                {timeline.map((t) => (
                  <div key={t.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                      <span className="flex-1 w-px bg-border" />
                    </div>
                    <div className="pb-2 min-w-0 flex-1">
                      <div className="text-sm font-medium">{t.title}</div>
                      {t.detail && <div className="text-[11px] text-muted-foreground truncate">{t.detail}</div>}
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {new Date(t.created_at).toLocaleString()}
                        {t.actor_id === user?.id ? " · you" : t.actor_id ? " · team member" : " · system"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {tab === "notes" && (
          <div className="space-y-2">
            <div className="card-elevated p-3.5 space-y-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Internal note — visible only to your company…"
                className="w-full p-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                {editingNote && (
                  <button
                    onClick={() => { setEditingNote(null); setNoteDraft(""); }}
                    className="h-10 px-4 rounded-2xl bg-secondary text-xs font-semibold press"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={saveNote}
                  disabled={noteDraft.trim().length < 2}
                  className="flex-1 h-10 rounded-2xl bg-primary text-primary-foreground text-xs font-semibold press disabled:opacity-50"
                >
                  {editingNote ? "Save changes" : "Add note"}
                </button>
              </div>
            </div>
            {notes.length === 0 ? (
              <EmptyState icon={StickyNote} title="No notes" description="Capture context your team should know." />
            ) : notes.map((n) => (
              <div key={n.id} className="card-elevated p-3.5">
                <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>{n.author_id === user?.id ? "You" : "Team member"}</span>
                  <span>· {new Date(n.created_at).toLocaleString()}</span>
                  {n.edit_count > 0 && <span>· edited {n.edit_count}×</span>}
                  <button
                    onClick={() => { setEditingNote(n); setNoteDraft(n.body); }}
                    className="ml-auto tap grid place-items-center" aria-label="Edit note"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientStatusSheet
        client={client} open={statusOpen}
        onClose={() => setStatusOpen(false)} onChanged={load}
      />

      <BottomSheet open={contactSheet} onClose={() => setContactSheet(false)} title="Add contact">
        <div className="space-y-2 pb-2">
          <input className={inputCls} placeholder="Name" maxLength={100}
            value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
          <input className={inputCls} placeholder="Position" maxLength={100}
            value={newContact.position} onChange={(e) => setNewContact({ ...newContact, position: e.target.value })} />
          <input className={inputCls} placeholder="Phone" maxLength={30}
            value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
          <input className={inputCls} placeholder="Email" maxLength={255}
            value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
          <select className={inputCls} value={newContact.preferred_method}
            onChange={(e) => setNewContact({ ...newContact, preferred_method: e.target.value })}>
            {CONTACT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={addContact} className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold press">
            Save contact
          </button>
        </div>
      </BottomSheet>
    </DashboardShell>
  );
}
