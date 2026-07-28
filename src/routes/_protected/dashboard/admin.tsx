import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Truck, Building2, FileText, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/admin")({ component: AdminDashboard });

function AdminDashboard() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [tab, setTab] = useState<"trucks" | "companies" | "drivers" | "docs">("trucks");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && role !== "admin") navigate({ to: "/" });
  }, [role, loading, navigate]);

  const refresh = async () => {
    const [t, c, d, dc] = await Promise.all([
      supabase.from("trucks").select("*").order("created_at", { ascending: false }),
      supabase.from("fleet_companies").select("*").order("created_at", { ascending: false }),
      supabase.from("driver_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("documents").select("*").order("uploaded_at", { ascending: false }),
    ]);
    setTrucks(t.data ?? []);
    setCompanies(c.data ?? []);
    setDrivers(d.data ?? []);
    setDocs(dc.data ?? []);
  };

  useEffect(() => { if (role === "admin") refresh(); }, [role]);

  if (role !== "admin") return null;

  const setVerified = async (table: "trucks" | "fleet_companies" | "driver_profiles", id: string, val: boolean, idCol = "id") => {
    setBusy(true);
    const { error } = await supabase.from(table).update({ verified: val }).eq(idCol, id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(val ? "Verified" : "Unverified"); refresh(); }
  };

  return (
    <DashboardShell title="Admin console" role="Admin">
      {/* Executive hero */}
      <div className="card-premium p-5 mb-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.25em] text-primary-foreground/70">
          <ShieldCheck className="h-3 w-3" /> Command center
        </div>
        <div className="font-display text-2xl font-bold mt-2 text-primary-foreground">
          Verify · Approve · Ship
        </div>
        <div className="text-primary-foreground/70 text-sm mt-1">
          {trucks.filter(t=>!t.verified).length + companies.filter(c=>!c.verified).length + drivers.filter(d=>!d.verified).length + docs.filter(d=>d.status==='pending').length} items need your review
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard label="Trucks" value={String(trucks.length)} sub={`${trucks.filter(t=>t.verified).length} verified`} tone="info" />
        <StatCard label="Companies" value={String(companies.length)} sub={`${companies.filter(c=>c.verified).length} verified`} />
        <StatCard label="Drivers" value={String(drivers.length)} sub={`${drivers.filter(d=>d.verified).length} verified`} tone="success" />
        <StatCard label="Docs" value={String(docs.length)} sub={`${docs.filter(d=>d.status==='pending').length} pending`} tone="warning" />
      </div>

      <div className="flex gap-1 mb-3 p-1 card-elevated rounded-2xl w-full sm:w-fit">
        {[
          { k: "trucks", label: "Trucks", icon: Truck },
          { k: "companies", label: "Companies", icon: Building2 },
          { k: "drivers", label: "Drivers", icon: ShieldCheck },
          { k: "docs", label: "Documents", icon: FileText },
        ].map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`flex-1 sm:flex-none text-xs px-3 py-2 rounded-xl inline-flex items-center justify-center gap-1.5 transition ${tab === k ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>


      <div className="glass rounded-2xl p-3 space-y-2">
        {tab === "trucks" && trucks.map((t) => (
          <Row
            key={t.id}
            title={`${t.truck_model} · ${t.plate}`}
            sub={`${t.capacity_tons}t · KSh ${Number(t.base_price).toLocaleString()} + KSh ${Number(t.price_per_km).toLocaleString()}/km`}
            verified={t.verified}
            onToggle={() => setVerified("trucks", t.id, !t.verified)}
            busy={busy}
          />
        ))}
        {tab === "companies" && companies.map((c) => (
          <Row
            key={c.user_id}
            title={c.company_name}
            sub={`Reg ${c.registration_no ?? "—"} · KRA ${c.kra_pin ?? "—"} · ${c.fleet_size ?? 0} trucks`}
            verified={c.verified}
            onToggle={() => setVerified("fleet_companies", c.user_id, !c.verified, "user_id")}
            busy={busy}
          />
        ))}
        {tab === "drivers" && drivers.map((d) => (
          <Row
            key={d.user_id}
            title={`${d.vehicle_make ?? "Driver"} ${d.vehicle_model ?? ""}`.trim()}
            sub={`Plate ${d.plate ?? "—"} · Licence ${d.license_no ?? "—"}`}
            verified={d.verified}
            onToggle={() => setVerified("driver_profiles", d.user_id, !d.verified, "user_id")}
            busy={busy}
          />
        ))}
        {tab === "docs" && docs.map((doc) => (
          <DocRow key={doc.id} doc={doc} onChange={refresh} />
        ))}
        {((tab === "trucks" && trucks.length === 0) ||
          (tab === "companies" && companies.length === 0) ||
          (tab === "drivers" && drivers.length === 0) ||
          (tab === "docs" && docs.length === 0)) && (
          <div className="text-center py-10 text-sm text-muted-foreground">Nothing here yet.</div>
        )}
      </div>
    </DashboardShell>
  );
}

function Row({ title, sub, verified, onToggle, busy }: { title: string; sub: string; verified: boolean; onToggle: () => void; busy: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">{title}</div>
        <div className="text-xs text-muted-foreground truncate font-mono">{sub}</div>
      </div>
      <button
        onClick={onToggle}
        disabled={busy}
        className={`text-[11px] px-3 py-1.5 rounded-full inline-flex items-center gap-1 font-medium press ${
          verified ? "status-success" : "bg-primary text-primary-foreground shadow-soft"
        }`}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : verified ? <><CheckCircle2 className="h-3 w-3" /> Verified</> : "Verify"}
      </button>
    </div>
  );
}


function DocRow({ doc, onChange }: { doc: any; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  const view = async () => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 60 * 10);
    if (error || !data) { toast.error(error?.message ?? "Could not open file"); return; }
    window.open(data.signedUrl, "_blank");
  };

  const setStatus = async (status: "approved" | "rejected" | "pending") => {
    setBusy(true);
    const { error } = await supabase.from("documents").update({ status }).eq("id", doc.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success(`Marked ${status}`); onChange(); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate capitalize">{String(doc.doc_type).replace(/_/g, " ")}</div>
          <div className="text-xs text-muted-foreground truncate font-mono">{doc.file_path}</div>
        </div>
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded-full ${doc.status === "approved" ? "status-success" : doc.status === "rejected" ? "status-urgent" : "status-warning"}`}>
          {doc.status}
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={view} className="flex-1 text-xs h-9 rounded-xl border border-border bg-secondary/60 hover:bg-secondary press">View file</button>
        <button onClick={() => setStatus("approved")} disabled={busy || doc.status === "approved"} className="flex-1 text-xs h-9 rounded-xl status-success disabled:opacity-40 press font-semibold">Approve</button>
        <button onClick={() => setStatus("rejected")} disabled={busy || doc.status === "rejected"} className="flex-1 text-xs h-9 rounded-xl status-urgent disabled:opacity-40 press font-semibold">Reject</button>
      </div>
    </div>
  );
}

