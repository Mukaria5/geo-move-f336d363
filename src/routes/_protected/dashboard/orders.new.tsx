import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, Check, Loader2, MapPin, Package, Truck as TruckIcon,
  User as UserIcon, DollarSign, FileText, Search, Cloud, Navigation, Fuel, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LeafletMap } from "@/components/LeafletMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { distanceKm, etaMinutes, geocode, type Truck } from "@/lib/booking-data";
import { CARGO_CATEGORIES, computeTotal, ksh } from "@/lib/orders-data";
import { driverAssignmentIssue } from "@/lib/driver-data-model";

export const Route = createFileRoute("/_protected/dashboard/orders/new")({
  component: NewOrderWizard,
});

type LatLng = { lat: number; lng: number };
type State = {
  client_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_contact_name: string;
  pickup_contact_phone: string;
  pickup_notes: string;
  pickup_at: string;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_contact_name: string;
  dropoff_contact_phone: string;
  dropoff_notes: string;
  dropoff_at: string;
  cargo_name: string;
  cargo_category: string;
  cargo_weight_tons: string;
  cargo_dimensions: string;
  cargo_quantity: string;
  special_instructions: string;
  truck_id: string | null;
  driver_id: string | null;
  price_per_km: string;
  base_charge: string;
  fuel_surcharge: string;
  toll_charges: string;
  loading_fee: string;
  offloading_fee: string;
  extra_charges: string;
};

const STEPS = [
  { id: 1, label: "Client", icon: UserIcon },
  { id: 2, label: "Pickup", icon: MapPin },
  { id: 3, label: "Delivery", icon: Navigation },
  { id: 4, label: "Cargo", icon: Package },
  { id: 5, label: "Transport", icon: DollarSign },
  { id: 6, label: "Assign", icon: TruckIcon },
  { id: 7, label: "Confirm", icon: Check },
];

function Input(p: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className, ...rest } = p;
  return (
    <label className="block">
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <input
        {...rest}
        className={`w-full rounded-xl border border-border bg-white/60 h-11 px-3 text-sm outline-none focus:border-primary transition ${className ?? ""}`}
      />
    </label>
  );
}
function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, className, ...rest } = p;
  return (
    <label className="block">
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <textarea
        {...rest}
        rows={3}
        className={`w-full rounded-xl border border-border bg-white/60 p-3 text-sm outline-none focus:border-primary transition ${className ?? ""}`}
      />
    </label>
  );
}

function GeoInput({
  label, value, onChange, onPick,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPick: (v: { name: string; lat: number; lng: number }) => void;
}) {
  const [results, setResults] = useState<{ display_name: string; lat: number; lng: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const search = async () => {
    if (!value.trim()) return;
    setBusy(true);
    const r = await geocode(value);
    setResults(r);
    setBusy(false);
  };
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
          placeholder="Search a place…"
          className="flex-1 rounded-xl border border-border bg-white/60 h-11 px-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={search}
          type="button"
          className="tap rounded-xl border border-border bg-white/60 px-3 h-11 text-sm"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 rounded-xl border border-border bg-white/80 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onPick({ name: r.display_name, lat: r.lat, lng: r.lng });
                setResults([]);
              }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-secondary border-b border-border last:border-b-0"
            >
              {r.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NewOrderWizard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);

  const [s, setS] = useState<State>({
    client_id: null, client_name: "", client_phone: "", client_email: "",
    pickup_address: "", pickup_lat: null, pickup_lng: null,
    pickup_contact_name: "", pickup_contact_phone: "", pickup_notes: "", pickup_at: "",
    dropoff_address: "", dropoff_lat: null, dropoff_lng: null,
    dropoff_contact_name: "", dropoff_contact_phone: "", dropoff_notes: "", dropoff_at: "",
    cargo_name: "", cargo_category: "Heavy Machinery", cargo_weight_tons: "",
    cargo_dimensions: "", cargo_quantity: "1", special_instructions: "",
    truck_id: null, driver_id: null,
    price_per_km: "300", base_charge: "5000", fuel_surcharge: "0",
    toll_charges: "0", loading_fee: "0", offloading_fee: "0", extra_charges: "0",
  });
  const set = (patch: Partial<State>) => setS((prev) => ({ ...prev, ...patch }));

  // Load trucks & drivers for assignment step
  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from("trucks")
        .select("*")
        .eq("verified", true)
        .eq("is_available", true);
      setTrucks((t as Truck[]) ?? []);
      // Only drivers who are eligible for dispatch (not suspended / expired licence / already busy)
      const { data: d } = await supabase
        .from("drivers")
        .select("*")
        .not("user_id", "is", null);
      const list = ((d as any[]) ?? [])
        .filter((r) => !driverAssignmentIssue(r))
        .map((r) => ({ id: r.user_id as string, full_name: r.full_name as string }));
      setDrivers(list);
    })();
  }, []);

  const distance = useMemo(() => {
    if (s.pickup_lat && s.pickup_lng && s.dropoff_lat && s.dropoff_lng) {
      return distanceKm(
        { lat: s.pickup_lat, lng: s.pickup_lng },
        { lat: s.dropoff_lat, lng: s.dropoff_lng },
      );
    }
    return 0;
  }, [s.pickup_lat, s.pickup_lng, s.dropoff_lat, s.dropoff_lng]);

  const eta = useMemo(() => (distance ? etaMinutes(distance) : 0), [distance]);

  const total = useMemo(() =>
    computeTotal({
      distance_km: distance,
      price_per_km: Number(s.price_per_km) || 0,
      base_charge: Number(s.base_charge) || 0,
      fuel_surcharge: Number(s.fuel_surcharge) || 0,
      toll_charges: Number(s.toll_charges) || 0,
      loading_fee: Number(s.loading_fee) || 0,
      offloading_fee: Number(s.offloading_fee) || 0,
      extra_charges: Number(s.extra_charges) || 0,
    }),
    [distance, s.price_per_km, s.base_charge, s.fuel_surcharge, s.toll_charges, s.loading_fee, s.offloading_fee, s.extra_charges],
  );

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return s.client_name.trim().length > 1;
      case 2: return s.pickup_address.length > 0 && s.pickup_lat !== null;
      case 3: return s.dropoff_address.length > 0 && s.dropoff_lat !== null;
      case 4: return s.cargo_name.trim().length > 0;
      case 5: return true;
      case 6: return true;
      case 7: return true;
    }
  }, [step, s]);

  const selectedTruck = trucks.find((t) => t.id === s.truck_id) ?? null;

  async function submit() {
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        created_by: user.id,
        fleet_owner_user_id: role === "fleet" ? user.id : null,
        client_id: s.client_id,
        client_name: s.client_name,
        client_phone: s.client_phone || null,
        client_email: s.client_email || null,
        pickup_address: s.pickup_address,
        pickup_lat: s.pickup_lat,
        pickup_lng: s.pickup_lng,
        pickup_contact_name: s.pickup_contact_name || null,
        pickup_contact_phone: s.pickup_contact_phone || null,
        pickup_notes: s.pickup_notes || null,
        pickup_at: s.pickup_at || null,
        dropoff_address: s.dropoff_address,
        dropoff_lat: s.dropoff_lat,
        dropoff_lng: s.dropoff_lng,
        dropoff_contact_name: s.dropoff_contact_name || null,
        dropoff_contact_phone: s.dropoff_contact_phone || null,
        dropoff_notes: s.dropoff_notes || null,
        dropoff_at: s.dropoff_at || null,
        cargo_name: s.cargo_name || null,
        cargo_category: s.cargo_category || null,
        cargo_weight_tons: s.cargo_weight_tons ? Number(s.cargo_weight_tons) : null,
        cargo_dimensions: s.cargo_dimensions || null,
        cargo_quantity: Number(s.cargo_quantity) || 1,
        special_instructions: s.special_instructions || null,
        truck_id: s.truck_id,
        driver_id: s.driver_id,
        distance_km: distance ? Number(distance.toFixed(2)) : null,
        eta_minutes: eta || null,
        price_per_km: Number(s.price_per_km) || 0,
        base_charge: Number(s.base_charge) || 0,
        fuel_surcharge: Number(s.fuel_surcharge) || 0,
        toll_charges: Number(s.toll_charges) || 0,
        loading_fee: Number(s.loading_fee) || 0,
        offloading_fee: Number(s.offloading_fee) || 0,
        extra_charges: Number(s.extra_charges) || 0,
        estimated_total: total,
        status: s.truck_id || s.driver_id ? "assigned" : "pending",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Order created");
    navigate({ to: "/dashboard/orders/$orderId", params: { orderId: data!.id } });
  }

  return (
    <DashboardShell title="New Order" role="Orders">
      {/* Stepper */}
      <div className="glass rounded-2xl p-3 mb-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {STEPS.map((st, i) => {
            const active = step === st.id;
            const done = step > st.id;
            const Icon = st.icon;
            return (
              <div key={st.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => done && setStep(st.id)}
                  className={`h-8 min-w-8 px-2 rounded-full grid place-items-center transition inline-flex gap-1 text-[11px] font-mono uppercase tracking-widest ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  {st.label}
                </button>
                {i < STEPS.length - 1 && <div className="h-px w-3 bg-border" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="glass rounded-2xl p-4 space-y-4">
        {step === 1 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Client information</div>
            {crmClients.length > 0 && (
              <label className="block">
                <span className="text-[11px] font-medium text-muted-foreground">Existing client</span>
                <select
                  value={s.crm_client_id ?? ""}
                  onChange={(e) => {
                    const c = crmClients.find((x) => x.id === e.target.value);
                    set(c
                      ? {
                          crm_client_id: c.id,
                          client_name: c.name,
                          client_phone: c.contact_phone ?? "",
                          client_email: c.contact_email ?? "",
                        }
                      : { crm_client_id: null });
                  }}
                  className="mt-1 w-full h-11 px-3 rounded-2xl border border-border bg-card text-sm outline-none focus:border-primary"
                >
                  <option value="">New / one-off client</option>
                  {crmClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.client_code ? ` · ${c.client_code}` : ""}</option>
                  ))}
                </select>
              </label>
            )}
            <Input label="Client name *" value={s.client_name} onChange={(e) => set({ client_name: e.target.value })} placeholder="Acme Construction Ltd" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Phone" value={s.client_phone} onChange={(e) => set({ client_phone: e.target.value })} placeholder="+254…" />
              <Input label="Email" value={s.client_email} onChange={(e) => set({ client_email: e.target.value })} placeholder="ops@acme.co" />
            </div>
            <Link to="/dashboard/fleet/clients/new" className="text-[11px] text-primary font-semibold">
              + Add this customer to the client directory
            </Link>
          </div>
        )}


        {step === 2 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Pickup information</div>
            <GeoInput
              label="Pickup location *"
              value={s.pickup_address}
              onChange={(v) => set({ pickup_address: v })}
              onPick={(p) => set({ pickup_address: p.name, pickup_lat: p.lat, pickup_lng: p.lng })}
            />
            {s.pickup_lat && s.pickup_lng && (
              <div className="relative h-40 rounded-xl overflow-hidden border border-border">
                <LeafletMap
                  center={{ lat: s.pickup_lat, lng: s.pickup_lng }}
                  zoom={13}
                  pickup={{ lat: s.pickup_lat, lng: s.pickup_lng }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input label="Contact name" value={s.pickup_contact_name} onChange={(e) => set({ pickup_contact_name: e.target.value })} />
              <Input label="Contact phone" value={s.pickup_contact_phone} onChange={(e) => set({ pickup_contact_phone: e.target.value })} />
            </div>
            <Input label="Pickup date/time" type="datetime-local" value={s.pickup_at} onChange={(e) => set({ pickup_at: e.target.value })} />
            <TextArea label="Pickup notes" value={s.pickup_notes} onChange={(e) => set({ pickup_notes: e.target.value })} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Delivery information</div>
            <GeoInput
              label="Delivery location *"
              value={s.dropoff_address}
              onChange={(v) => set({ dropoff_address: v })}
              onPick={(p) => set({ dropoff_address: p.name, dropoff_lat: p.lat, dropoff_lng: p.lng })}
            />
            {s.dropoff_lat && s.dropoff_lng && (
              <div className="relative h-40 rounded-xl overflow-hidden border border-border">
                <LeafletMap
                  center={{ lat: s.dropoff_lat, lng: s.dropoff_lng }}
                  zoom={13}
                  dropoff={{ lat: s.dropoff_lat, lng: s.dropoff_lng }}
                  pickup={s.pickup_lat && s.pickup_lng ? { lat: s.pickup_lat, lng: s.pickup_lng } : null}
                  showRoute={!!(s.pickup_lat && s.dropoff_lat)}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input label="Contact name" value={s.dropoff_contact_name} onChange={(e) => set({ dropoff_contact_name: e.target.value })} />
              <Input label="Contact phone" value={s.dropoff_contact_phone} onChange={(e) => set({ dropoff_contact_phone: e.target.value })} />
            </div>
            <Input label="Delivery date/time" type="datetime-local" value={s.dropoff_at} onChange={(e) => set({ dropoff_at: e.target.value })} />
            <TextArea label="Delivery notes" value={s.dropoff_notes} onChange={(e) => set({ dropoff_notes: e.target.value })} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Cargo information</div>
            <Input label="Cargo name *" value={s.cargo_name} onChange={(e) => set({ cargo_name: e.target.value })} placeholder="Excavator CAT 320" />
            <label className="block">
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Category</div>
              <select
                value={s.cargo_category}
                onChange={(e) => set({ cargo_category: e.target.value })}
                className="w-full rounded-xl border border-border bg-white/60 h-11 px-3 text-sm outline-none focus:border-primary"
              >
                {CARGO_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Input label="Weight (T)" type="number" step="0.1" value={s.cargo_weight_tons} onChange={(e) => set({ cargo_weight_tons: e.target.value })} />
              <Input label="Quantity" type="number" value={s.cargo_quantity} onChange={(e) => set({ cargo_quantity: e.target.value })} />
              <Input label="Dimensions" value={s.cargo_dimensions} onChange={(e) => set({ cargo_dimensions: e.target.value })} placeholder="LxWxH" />
            </div>
            <TextArea label="Special instructions" value={s.special_instructions} onChange={(e) => set({ special_instructions: e.target.value })} />
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" /> Attach photos, permits, delivery documents — upload available in Order Details after creation.
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Transport & pricing</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border bg-white/60 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Distance</div>
                <div className="text-lg font-bold">{distance ? distance.toFixed(1) : "—"} km</div>
              </div>
              <div className="rounded-xl border border-border bg-white/60 p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">ETA</div>
                <div className="text-lg font-bold">{eta ? `${eta} min` : "—"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Price / km" type="number" value={s.price_per_km} onChange={(e) => set({ price_per_km: e.target.value })} />
              <Input label="Base charge" type="number" value={s.base_charge} onChange={(e) => set({ base_charge: e.target.value })} />
              <Input label="Fuel surcharge" type="number" value={s.fuel_surcharge} onChange={(e) => set({ fuel_surcharge: e.target.value })} />
              <Input label="Toll charges" type="number" value={s.toll_charges} onChange={(e) => set({ toll_charges: e.target.value })} />
              <Input label="Loading fee" type="number" value={s.loading_fee} onChange={(e) => set({ loading_fee: e.target.value })} />
              <Input label="Offloading fee" type="number" value={s.offloading_fee} onChange={(e) => set({ offloading_fee: e.target.value })} />
              <Input label="Extra charges" type="number" value={s.extra_charges} onChange={(e) => set({ extra_charges: e.target.value })} />
            </div>
            <div className="rounded-2xl bg-primary/10 border border-primary/30 p-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Estimated total</div>
                <div className="text-2xl font-bold font-mono">{ksh(total)}</div>
              </div>
              <DollarSign className="h-8 w-8 text-primary/50" />
            </div>
            <div className="rounded-xl border border-dashed border-border p-3 text-xs text-muted-foreground grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1"><Cloud className="h-3 w-3" /> Weather (soon)</div>
              <div className="flex items-center gap-1"><Fuel className="h-3 w-3" /> Fuel estimation (soon)</div>
              <div className="flex items-center gap-1"><Navigation className="h-3 w-3" /> Route optimization (soon)</div>
              <div className="flex items-center gap-1"><Receipt className="h-3 w-3" /> Toll calculation (soon)</div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Assign resources</div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Vehicle</div>
              <div className="space-y-1.5 max-h-56 overflow-auto">
                {trucks.length === 0 && (
                  <div className="text-xs text-muted-foreground">No verified available trucks. You can leave this blank and assign later.</div>
                )}
                {trucks.map((t) => {
                  const active = s.truck_id === t.id;
                  const cargoW = Number(s.cargo_weight_tons) || 0;
                  const overweight = cargoW > 0 && cargoW > Number(t.capacity_tons);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={overweight}
                      onClick={() => set({ truck_id: active ? null : t.id, driver_id: t.driver_id ?? s.driver_id })}
                      className={`w-full text-left rounded-xl border p-3 transition ${
                        active ? "border-primary bg-primary/10" : "border-border bg-white/60 hover:bg-secondary"
                      } ${overweight ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <TruckIcon className="h-4 w-4 text-primary" />
                        <div className="flex-1">
                          <div className="text-sm font-semibold">{t.truck_model} · {t.plate}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {t.capacity_tons}T · KSh {t.price_per_km}/km · base {t.base_price}
                            {overweight ? " · over capacity" : ""}
                          </div>
                        </div>
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Driver</div>
              <select
                value={s.driver_id ?? ""}
                onChange={(e) => set({ driver_id: e.target.value || null })}
                className="w-full rounded-xl border border-border bg-white/60 h-11 px-3 text-sm outline-none"
              >
                <option value="">— Not assigned —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold">Review & confirm</div>
            <div className="rounded-xl border border-border bg-white/60 p-3 text-sm space-y-2">
              <Row k="Client" v={s.client_name || "—"} />
              <Row k="Pickup" v={s.pickup_address || "—"} />
              <Row k="Delivery" v={s.dropoff_address || "—"} />
              <Row k="Cargo" v={`${s.cargo_name || "—"} · ${s.cargo_category}`} />
              <Row k="Distance" v={`${distance ? distance.toFixed(1) : "—"} km · ETA ${eta || "—"} min`} />
              <Row k="Vehicle" v={selectedTruck ? `${selectedTruck.truck_model} · ${selectedTruck.plate}` : "Unassigned"} />
              <Row k="Driver" v={s.driver_id ? (drivers.find((d) => d.id === s.driver_id)?.full_name ?? "Selected") : "Unassigned"} />
              <div className="h-px bg-border my-1" />
              <Row k="Total" v={ksh(total)} bold />
            </div>
          </div>
        )}
      </div>

      {/* Nav footer */}
      <div className="sticky bottom-24 mt-3 flex items-center gap-2 max-w-3xl mx-auto">
        {step > 1 ? (
          <button
            onClick={() => setStep((n) => n - 1)}
            className="tap flex-1 h-12 rounded-2xl border border-border bg-white/80 text-sm font-semibold inline-flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <Link
            to="/dashboard/orders"
            className="tap flex-1 h-12 rounded-2xl border border-border bg-white/80 text-sm font-semibold inline-flex items-center justify-center"
          >
            Cancel
          </Link>
        )}
        {step < 7 ? (
          <button
            onClick={() => setStep((n) => n + 1)}
            disabled={!canNext}
            className="tap flex-[1.5] h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-40"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={saving}
            className="tap flex-[1.5] h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Create Order
          </button>
        )}
      </div>
    </DashboardShell>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground shrink-0">{k}</div>
      <div className={`text-right ${bold ? "font-bold text-base" : ""}`}>{v}</div>
    </div>
  );
}
