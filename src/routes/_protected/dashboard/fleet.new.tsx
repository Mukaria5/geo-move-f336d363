import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Loader2, Check, Truck, Upload, Trash2, Satellite,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadVehicleMedia } from "@/lib/vehicle-media";
import {
  VEHICLE_TYPES, FUEL_TYPES, TRANSMISSIONS, TRACKER_PROVIDERS,
  TRACKER_DEVICE_STATUS, VEHICLE_DOC_KINDS,
} from "@/lib/fleet-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/new")({ component: AddVehicleWizard });

const STEPS = ["Basics", "Specs", "Assignment", "Tracker", "Documents", "Confirm"];

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        {...rest}
        className="mt-1 w-full h-12 px-3.5 rounded-2xl bg-secondary/70 border border-border focus:border-primary focus:bg-card outline-none text-sm transition"
      />
    </label>
  );
}

function Select({ label, options, ...rest }: { label: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <select
        {...rest}
        className="mt-1 w-full h-12 px-3 rounded-2xl bg-secondary/70 border border-border focus:border-primary focus:bg-card outline-none text-sm transition"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

type PendingDoc = { kind: string; file: File };

function AddVehicleWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);

  const [f, setF] = useState({
    plate: "", fleet_number: "", vehicle_type: VEHICLE_TYPES[0]!, make: "", model: "",
    year: "", color: "",
    capacity_tons: "30", axles: "3", weight_kg: "", fuel_type: FUEL_TYPES[0]!, transmission: TRANSMISSIONS[0]!,
    driver_id: "", branch: "", manager: "",
    base_price: "5000", price_per_km: "300",
    tracker_provider: TRACKER_PROVIDERS[0]!, tracker_id: "", tracker_sim: "", tracker_status: "unknown",
    insurance_expiry: "", road_licence_expiry: "", last_service_date: "", next_service_date: "",
  });
  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    supabase
      .from("user_roles").select("user_id, profiles:profiles!inner(id, full_name)").eq("role", "driver")
      .then(({ data }) => setDrivers((data ?? []).map((r: any) => ({ id: r.user_id, full_name: r.profiles?.full_name || "Driver" }))));
  }, []);

  const canNext = useMemo(() => {
    if (step === 0) return f.plate.trim().length > 2 && !!f.vehicle_type;
    return true;
  }, [step, f]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      let photo_url: string | null = null;
      if (photo) photo_url = await uploadVehicleMedia(user.id, photo, "photos");

      const { data: truck, error } = await supabase
        .from("trucks")
        .insert({
          owner_id: user.id,
          fleet_owner_user_id: user.id,
          truck_model: [f.make, f.model].filter(Boolean).join(" ") || f.vehicle_type,
          plate: f.plate.toUpperCase().trim(),
          capacity_tons: Number(f.capacity_tons) || 30,
          base_price: Number(f.base_price) || 0,
          price_per_km: Number(f.price_per_km) || 0,
          driver_id: f.driver_id || null,
          fleet_number: f.fleet_number || null,
          vehicle_type: f.vehicle_type,
          make: f.make || null,
          model: f.model || null,
          year: f.year ? Number(f.year) : null,
          color: f.color || null,
          axles: f.axles ? Number(f.axles) : null,
          weight_kg: f.weight_kg ? Number(f.weight_kg) : null,
          fuel_type: f.fuel_type,
          transmission: f.transmission,
          branch: f.branch || null,
          photo_url,
          tracker_provider: f.tracker_provider,
          tracker_id: f.tracker_id || null,
          tracker_sim: f.tracker_sim || null,
          tracker_status: f.tracker_status,
          insurance_expiry: f.insurance_expiry || null,
          road_licence_expiry: f.road_licence_expiry || null,
          last_service_date: f.last_service_date || null,
          next_service_date: f.next_service_date || null,
          status: "available" as const,
          is_available: true,
          is_online: false,
          verified: false,
        })
        .select("id")
        .single();
      if (error) throw error;

      for (const d of docs) {
        const path = await uploadVehicleMedia(user.id, d.file, "documents");
        await supabase.from("vehicle_documents").insert({
          truck_id: truck.id, uploaded_by: user.id, kind: d.kind, label: d.file.name, file_path: path,
        });
      }

      toast.success("Vehicle added — awaiting admin verification before it goes live.");
      navigate({ to: "/dashboard/fleet/vehicles/$vehicleId", params: { vehicleId: truck.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save vehicle");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell title="Add vehicle" role="Fleet">
      {/* Progress */}
      <div className="card-elevated p-4 mb-3">
        <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          <span>Step {step + 1} of {STEPS.length}</span>
          <span>{STEPS[step]}</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 30 }}
          />
        </div>
      </div>

      <div className="card-elevated p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {step === 0 && (
              <>
                <Field label="Registration number" placeholder="KCA 123A" value={f.plate} onChange={set("plate")} />
                <Field label="Fleet number" placeholder="LL-014" value={f.fleet_number} onChange={set("fleet_number")} />
                <Select label="Vehicle type" options={VEHICLE_TYPES} value={f.vehicle_type} onChange={set("vehicle_type")} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Make" placeholder="Mercedes" value={f.make} onChange={set("make")} />
                  <Field label="Model" placeholder="Actros 4148" value={f.model} onChange={set("model")} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Year" type="number" placeholder="2019" value={f.year} onChange={set("year")} />
                  <Field label="Colour" placeholder="White" value={f.color} onChange={set("color")} />
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Capacity (tons)" type="number" value={f.capacity_tons} onChange={set("capacity_tons")} />
                  <Field label="Axles" type="number" value={f.axles} onChange={set("axles")} />
                </div>
                <Field label="Tare weight (kg)" type="number" placeholder="12000" value={f.weight_kg} onChange={set("weight_kg")} />
                <div className="grid grid-cols-2 gap-2">
                  <Select label="Fuel type" options={FUEL_TYPES} value={f.fuel_type} onChange={set("fuel_type")} />
                  <Select label="Transmission" options={TRANSMISSIONS} value={f.transmission} onChange={set("transmission")} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Base charge (KSh)" type="number" value={f.base_price} onChange={set("base_price")} />
                  <Field label="Per km (KSh)" type="number" value={f.price_per_km} onChange={set("price_per_km")} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <label className="block">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Driver</span>
                  <select
                    value={f.driver_id} onChange={set("driver_id")}
                    className="mt-1 w-full h-12 px-3 rounded-2xl bg-secondary/70 border border-border focus:border-primary outline-none text-sm"
                  >
                    <option value="">Unassigned</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </label>
                <Field label="Fleet manager" placeholder="Name of responsible manager" value={f.manager} onChange={set("manager")} />
                <Field label="Branch / depot" placeholder="Nairobi — Industrial Area" value={f.branch} onChange={set("branch")} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Insurance expiry" type="date" value={f.insurance_expiry} onChange={set("insurance_expiry")} />
                  <Field label="Road licence expiry" type="date" value={f.road_licence_expiry} onChange={set("road_licence_expiry")} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Last service" type="date" value={f.last_service_date} onChange={set("last_service_date")} />
                  <Field label="Next service" type="date" value={f.next_service_date} onChange={set("next_service_date")} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="flex items-center gap-2 rounded-2xl status-info p-3 text-xs">
                  <Satellite className="h-4 w-4 shrink-0" />
                  Tracker details prepare this vehicle for live GPS, telemetry and geofencing.
                </div>
                <Select label="Tracker provider" options={TRACKER_PROVIDERS} value={f.tracker_provider} onChange={set("tracker_provider")} />
                <Field label="Tracker ID" placeholder="Device serial" value={f.tracker_id} onChange={set("tracker_id")} />
                <Field label="SIM number" placeholder="+254…" value={f.tracker_sim} onChange={set("tracker_sim")} />
                <Select label="Device status" options={TRACKER_DEVICE_STATUS} value={f.tracker_status} onChange={set("tracker_status")} />
              </>
            )}

            {step === 4 && (
              <>
                <label className="block rounded-2xl border border-dashed border-border p-4 text-center cursor-pointer press">
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                  />
                  <Upload className="h-5 w-5 mx-auto text-primary mb-1.5" />
                  <div className="text-sm font-semibold">{photo ? photo.name : "Vehicle photo"}</div>
                  <div className="text-[11px] text-muted-foreground">Used as the cover image on fleet cards</div>
                </label>

                {VEHICLE_DOC_KINDS.filter((k) => k.key !== "photo").map((k) => (
                  <label key={k.key} className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 p-3 cursor-pointer press">
                    <Upload className="h-4 w-4 text-primary" />
                    <span className="text-sm flex-1">{k.label}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {docs.filter((d) => d.kind === k.key).length || "Add"}
                    </span>
                    <input
                      type="file" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setDocs((d) => [...d, { kind: k.key, file }]);
                      }}
                    />
                  </label>
                ))}

                {docs.length > 0 && (
                  <div className="space-y-1.5">
                    {docs.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs rounded-xl bg-secondary/60 p-2.5">
                        <span className="font-semibold capitalize">{d.kind.replace(/_/g, " ")}</span>
                        <span className="text-muted-foreground truncate flex-1">{d.file.name}</span>
                        <button onClick={() => setDocs((x) => x.filter((_, j) => j !== i))} aria-label="Remove">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 5 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-display font-semibold">{f.plate.toUpperCase() || "New vehicle"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[f.make, f.model, f.vehicle_type].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                {[
                  ["Fleet number", f.fleet_number], ["Year", f.year], ["Colour", f.color],
                  ["Capacity", `${f.capacity_tons} t`], ["Axles", f.axles], ["Fuel", f.fuel_type],
                  ["Transmission", f.transmission], ["Branch", f.branch],
                  ["Driver", drivers.find((d) => d.id === f.driver_id)?.full_name ?? "Unassigned"],
                  ["Tracker", f.tracker_id ? `${f.tracker_provider} · ${f.tracker_id}` : f.tracker_provider],
                  ["Insurance expiry", f.insurance_expiry], ["Road licence expiry", f.road_licence_expiry],
                  ["Documents", `${docs.length + (photo ? 1 : 0)} file(s)`],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex items-center justify-between text-xs border-b border-border/70 py-2">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v || "—"}</span>
                  </div>
                ))}
                <div className="text-[11px] rounded-2xl status-warning p-3">
                  New vehicles stay hidden from clients until an administrator verifies them.
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom action bar */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => (step === 0 ? navigate({ to: "/dashboard/fleet" }) : setStep((s) => s - 1))}
          className="h-12 px-4 rounded-2xl bg-secondary text-foreground font-semibold text-sm inline-flex items-center gap-1 press"
        >
          <ChevronLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canNext ? setStep((s) => s + 1) : toast.error("Registration and vehicle type are required")}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-1 shadow-glow press"
          >
            Continue <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-glow press disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save vehicle</>}
          </button>
        )}
      </div>
    </DashboardShell>
  );
}
