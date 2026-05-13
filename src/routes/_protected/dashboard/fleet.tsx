import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Truck, Plus, Loader2, CheckCircle2, Clock, X, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_protected/dashboard/fleet")({ component: FleetDashboard });

type TruckRow = {
  id: string;
  truck_model: string;
  plate: string;
  capacity_tons: number;
  base_price: number;
  price_per_km: number;
  is_online: boolean;
  is_available: boolean;
  verified: boolean;
  driver_id: string | null;
};

function FleetDashboard() {
  const { user } = useAuth();
  const [company, setCompany] = useState<any>(null);
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from("fleet_companies").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("trucks").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
    ]);
    setCompany(c);
    setTrucks((t as TruckRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, [user]);

  const verifiedCount = trucks.filter((t) => t.verified).length;
  const onlineCount = trucks.filter((t) => t.is_online).length;

  return (
    <DashboardShell title={company?.company_name ?? "Fleet dashboard"} role="Fleet">
      <div className="glass-strong rounded-2xl p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg font-bold">{company?.company_name ?? "Your fleet"}</div>
            <div className="text-xs text-muted-foreground">
              {trucks.length} trucks · {company?.verified ? "Verified company" : "Company pending verification"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <StatCard label="Trucks" value={String(trucks.length)} />
        <StatCard label="Verified" value={String(verifiedCount)} sub="visible to clients" />
        <StatCard label="Online" value={String(onlineCount)} />
        <StatCard label="Revenue" value="KSh 0" sub="this month" />
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">My trucks</div>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs font-medium text-primary inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-primary/10"
          >
            <Plus className="h-3 w-3" /> Add truck
          </button>
        </div>

        {loading ? (
          <div className="py-10 grid place-items-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : trucks.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Truck className="h-6 w-6 mx-auto mb-2 opacity-50" />
            No trucks added yet. Add your first truck to start receiving jobs.
          </div>
        ) : (
          <div className="space-y-2">
            {trucks.map((t) => <TruckCard key={t.id} truck={t} onChange={refresh} />)}
          </div>
        )}
      </div>

      <DocsPanel />

      <AnimatePresence>
        {showAdd && user && (
          <AddTruckModal
            userId={user.id}
            onClose={() => setShowAdd(false)}
            onCreated={() => { setShowAdd(false); refresh(); }}
          />
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}

function TruckCard({ truck, onChange }: { truck: TruckRow; onChange: () => void }) {
  const [busy, setBusy] = useState(false);

  const toggleAvailable = async () => {
    setBusy(true);
    const { error } = await supabase.from("trucks")
      .update({ is_available: !truck.is_available })
      .eq("id", truck.id);
    setBusy(false);
    if (error) toast.error(error.message); else onChange();
  };

  return (
    <div className="rounded-xl border border-border bg-white/5 p-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center">
          <Truck className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-2">
            {truck.truck_model}
            {truck.verified ? (
              <span className="text-[10px] inline-flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Verified</span>
            ) : (
              <span className="text-[10px] inline-flex items-center gap-1 text-amber-400"><Clock className="h-3 w-3" /> Pending admin</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{truck.plate} · {truck.capacity_tons}t</div>
          <div className="text-xs mt-1">
            <span className="text-muted-foreground">Base </span>
            <span className="font-mono">KSh {Number(truck.base_price).toLocaleString()}</span>
            <span className="text-muted-foreground"> + </span>
            <span className="font-mono">KSh {Number(truck.price_per_km).toLocaleString()}/km</span>
          </div>
        </div>
        <button
          onClick={toggleAvailable}
          disabled={busy}
          className={`text-[11px] px-2 py-1 rounded-md font-medium ${
            truck.is_available ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-muted-foreground"
          }`}
        >
          {truck.is_available ? "Available" : "Off duty"}
        </button>
      </div>
    </div>
  );
}

function AddTruckModal({ userId, onClose, onCreated }: { userId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    truck_model: "",
    plate: "",
    capacity_tons: "30",
    base_price: "5000",
    price_per_km: "300",
    driver_email: "",
  });
  const [busy, setBusy] = useState(false);

  const update = (k: keyof typeof form) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.truck_model || !form.plate) {
      toast.error("Model and plate are required");
      return;
    }
    setBusy(true);

    let driver_id: string | null = null;
    if (form.driver_email.trim()) {
      // Best-effort lookup via profiles (no auth.users access from client)
      const { data: prof } = await supabase
        .from("profiles").select("id").ilike("full_name", `%${form.driver_email.trim()}%`).maybeSingle();
      if (prof?.id) driver_id = prof.id;
    }

    const { error } = await supabase.from("trucks").insert({
      owner_id: userId,
      fleet_owner_user_id: userId,
      truck_model: form.truck_model,
      plate: form.plate.toUpperCase(),
      capacity_tons: Number(form.capacity_tons) || 30,
      base_price: Number(form.base_price) || 0,
      price_per_km: Number(form.price_per_km) || 0,
      driver_id,
      is_available: true,
      is_online: false,
      verified: false,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Truck added — awaiting admin verification before it appears to clients.");
    onCreated();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-strong rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Add a truck</h3>
          <button type="button" onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-white/5"><X className="h-4 w-4" /></button>
        </div>

        <FormField label="Truck model" placeholder="e.g. Mercedes Actros 4148" value={form.truck_model} onChange={update("truck_model")} />
        <FormField label="Number plate" placeholder="KCA 123A" value={form.plate} onChange={update("plate")} />
        <div className="grid grid-cols-3 gap-2">
          <FormField label="Capacity (t)" type="number" value={form.capacity_tons} onChange={update("capacity_tons")} />
          <FormField label="Base (KSh)" type="number" value={form.base_price} onChange={update("base_price")} />
          <FormField label="Per km (KSh)" type="number" value={form.price_per_km} onChange={update("price_per_km")} />
        </div>
        <FormField label="Driver name (optional)" placeholder="Search profile name" value={form.driver_email} onChange={update("driver_email")} />

        <div className="text-[11px] text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
          New trucks are not visible to clients until an admin verifies them.
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 glow-safety"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add truck"}
        </button>
      </motion.form>
    </motion.div>
  );
}

function FormField({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="mt-1 w-full h-10 px-3 rounded-lg bg-white/5 border border-border focus:border-primary/60 outline-none text-sm"
      />
    </label>
  );
}
