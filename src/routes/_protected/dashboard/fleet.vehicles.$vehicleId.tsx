import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Loader2, Truck as TruckIcon, Wrench, Fuel, FileText, History,
  Plus, Eye, MapPin, Settings2, Package, Phone, Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { LeafletMap } from "@/components/LeafletMap";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/fleet/VehicleCard";
import { VehicleStatusSheet } from "@/components/fleet/VehicleStatusSheet";
import { AssignVehicleSheet } from "@/components/fleet/AssignVehicleSheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadVehicleMedia, vehicleMediaUrl } from "@/lib/vehicle-media";
import {
  MAINTENANCE_TYPES, VEHICLE_DOC_KINDS, VEHICLE_STATUS_META, buildFleetAlerts,
  ksh, vehicleTitle, type VehicleRow,
} from "@/lib/fleet-data";

export const Route = createFileRoute("/_protected/dashboard/fleet/vehicles/$vehicleId")({
  component: VehicleDetail,
});

const TABS = ["Overview", "Trips", "Maintenance", "Fuel", "Documents"] as const;
type Tab = (typeof TABS)[number];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs border-b border-border/70 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value || "—"}</span>
    </div>
  );
}

function VehicleDetail() {
  const { vehicleId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState<VehicleRow | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [driver, setDriver] = useState<{ full_name: string | null; phone: string | null } | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [maint, setMaint] = useState<any[]>([]);
  const [fuel, setFuel] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [maintOpen, setMaintOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("trucks").select("*").eq("id", vehicleId).maybeSingle();
    const row = data as VehicleRow | null;
    setV(row);
    setLoading(false);
    if (!row) return;
    setPhoto(await vehicleMediaUrl(row.photo_url));
    if (row.driver_id) {
      const { data: p } = await supabase.from("profiles").select("full_name, phone").eq("id", row.driver_id).maybeSingle();
      setDriver(p ?? null);
    }
    const [{ data: ev }, { data: tr }, { data: mt }, { data: fl }, { data: dc }] = await Promise.all([
      supabase.from("vehicle_status_events").select("*").eq("truck_id", vehicleId).order("created_at", { ascending: false }).limit(40),
      supabase.from("orders").select("id, order_number, status, pickup_address, dropoff_address, distance_km, final_total, estimated_total, created_at").eq("truck_id", vehicleId).order("created_at", { ascending: false }).limit(30),
      supabase.from("vehicle_maintenance").select("*").eq("truck_id", vehicleId).order("service_date", { ascending: false }),
      supabase.from("vehicle_fuel_logs").select("*").eq("truck_id", vehicleId).order("filled_at", { ascending: false }),
      supabase.from("vehicle_documents").select("*").eq("truck_id", vehicleId).order("created_at", { ascending: false }),
    ]);
    setEvents(ev ?? []); setTrips(tr ?? []); setMaint(mt ?? []); setFuel(fl ?? []); setDocs(dc ?? []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [vehicleId]);

  if (loading) {
    return (
      <DashboardShell title="Vehicle" role="Fleet">
        <div className="py-20 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </DashboardShell>
    );
  }
  if (!v) {
    return (
      <DashboardShell title="Vehicle" role="Fleet">
        <EmptyState icon={TruckIcon} title="Vehicle not found" description="It may have been removed from your fleet." />
      </DashboardShell>
    );
  }

  const alerts = buildFleetAlerts([v]);
  const totalFuelCost = fuel.reduce((s, r) => s + Number(r.cost ?? 0), 0);
  const totalLitres = fuel.reduce((s, r) => s + Number(r.litres ?? 0), 0);
  const maintCost = maint.reduce((s, r) => s + Number(r.cost ?? 0), 0);

  const viewDoc = async (path: string) => {
    const url = await vehicleMediaUrl(path);
    if (!url) { toast.error("Could not open document"); return; }
    window.open(url, "_blank");
  };

  return (
    <DashboardShell title={v.plate} role="Fleet">
      <button onClick={() => navigate({ to: "/dashboard/fleet" })} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-3 press">
        <ChevronLeft className="h-4 w-4" /> Fleet
      </button>

      {/* Hero */}
      <div className="card-premium p-0 mb-3 overflow-hidden relative">
        {photo && <img src={photo} alt={`${v.plate}`} className="h-40 w-full object-cover opacity-90" />}
        <div className="p-5 relative">
          <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
          <div className="flex items-start gap-3 relative">
            <div className="h-12 w-12 rounded-2xl bg-gold/90 text-primary grid place-items-center shrink-0 shadow-gold">
              <TruckIcon className="h-5 w-5" strokeWidth={2.3} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl font-bold text-primary-foreground truncate">{v.plate}</div>
              <div className="text-xs text-primary-foreground/70 truncate">
                {vehicleTitle(v)}{v.vehicle_type ? ` · ${v.vehicle_type}` : ""}{v.fleet_number ? ` · #${v.fleet_number}` : ""}
              </div>
              <div className="mt-2"><StatusChip status={v.status} /></div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 relative">
            <button onClick={() => setStatusOpen(true)} className="flex-1 h-10 rounded-2xl bg-primary-foreground/15 text-primary-foreground text-xs font-semibold inline-flex items-center justify-center gap-1.5 press">
              <Settings2 className="h-3.5 w-3.5" /> Status
            </button>
            <button onClick={() => setAssignOpen(true)} className="flex-1 h-10 rounded-2xl bg-gold text-primary text-xs font-semibold inline-flex items-center justify-center gap-1.5 press">
              <Package className="h-3.5 w-3.5" /> Assign
            </button>
            {driver?.phone && (
              <a href={`tel:${driver.phone}`} className="h-10 w-10 rounded-2xl bg-primary-foreground/15 text-primary-foreground grid place-items-center press" aria-label="Call driver">
                <Phone className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {alerts.map((a) => (
            <div key={a.id} className={`text-xs rounded-2xl p-3 ${a.severity === "urgent" ? "status-urgent" : "status-warning"}`}>
              <strong>{a.title}</strong> — {a.detail}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold press transition ${
              tab === t ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {tab === "Overview" && (
            <div className="space-y-3">
              <div className="card-elevated p-4">
                <div className="text-sm font-display font-semibold mb-1">Specifications</div>
                <Row label="Make / model" value={vehicleTitle(v)} />
                <Row label="Year" value={v.year} />
                <Row label="Colour" value={v.color} />
                <Row label="Capacity" value={`${Number(v.capacity_tons)} tons`} />
                <Row label="Axles" value={v.axles} />
                <Row label="Tare weight" value={v.weight_kg ? `${v.weight_kg} kg` : null} />
                <Row label="Fuel type" value={v.fuel_type} />
                <Row label="Transmission" value={v.transmission} />
                <Row label="Rates" value={`${ksh(v.base_price)} + ${ksh(v.price_per_km)}/km`} />
              </div>

              <div className="card-elevated p-4">
                <div className="text-sm font-display font-semibold mb-1">Assignment & compliance</div>
                <Row label="Driver" value={driver?.full_name ?? "Unassigned"} />
                <Row label="Branch" value={v.branch} />
                <Row label="Verification" value={v.verified ? "Verified" : "Pending admin review"} />
                <Row label="Insurance expiry" value={v.insurance_expiry} />
                <Row label="Road licence expiry" value={v.road_licence_expiry} />
                <Row label="Last service" value={v.last_service_date} />
                <Row label="Next service" value={v.next_service_date} />
              </div>

              <div className="card-elevated p-4">
                <div className="text-sm font-display font-semibold mb-1">Tracker</div>
                <Row label="Provider" value={v.tracker_provider} />
                <Row label="Device ID" value={v.tracker_id} />
                <Row label="SIM" value={v.tracker_sim} />
                <Row label="Device status" value={v.tracker_status} />
                <Row label="Fuel level" value={v.fuel_level_pct != null ? `${v.fuel_level_pct}%` : null} />
              </div>

              <div className="card-elevated p-0 overflow-hidden">
                <div className="p-4 pb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div className="text-sm font-display font-semibold">Last known position</div>
                </div>
                {v.current_lat != null && v.current_lng != null ? (
                  <div className="h-52">
                    <LeafletMap
                      className="h-full w-full"
                      center={{ lat: v.current_lat, lng: v.current_lng }}
                      zoom={13}
                      trucks={[v] as any}
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground">No location reported yet.</div>
                )}
              </div>
            </div>
          )}

          {tab === "Trips" && (
            <div className="space-y-3">
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-4 w-4 text-primary" />
                  <div className="text-sm font-display font-semibold">Trip history</div>
                </div>
                {trips.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center">No trips recorded for this vehicle.</div>
                ) : (
                  <div className="space-y-2">
                    {trips.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => navigate({ to: "/dashboard/orders/$orderId", params: { orderId: t.id } })}
                        className="w-full text-left rounded-2xl border border-border bg-secondary/50 p-3 press"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{t.order_number}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-soft text-primary capitalize">
                            {String(t.status).replace(/_/g, " ")}
                          </span>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {new Date(t.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {t.pickup_address} → {t.dropoff_address}
                        </div>
                        <div className="text-[11px] mt-0.5 font-mono">
                          {t.distance_km ? `${Number(t.distance_km).toFixed(1)} km · ` : ""}
                          {ksh(t.final_total ?? t.estimated_total)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-elevated p-4">
                <div className="text-sm font-display font-semibold mb-2">Status timeline</div>
                {events.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center">No status changes yet.</div>
                ) : (
                  <div className="space-y-2">
                    {events.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 text-xs">
                        <span className={`h-2 w-2 rounded-full ${VEHICLE_STATUS_META[e.status as VehicleRow["status"]].dot}`} />
                        <span className="font-medium">{VEHICLE_STATUS_META[e.status as VehicleRow["status"]].label}</span>
                        {e.note && <span className="text-muted-foreground truncate">· {e.note}</span>}
                        <span className="ml-auto text-muted-foreground font-mono text-[11px]">
                          {new Date(e.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "Maintenance" && (
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="h-4 w-4 text-primary" />
                <div className="text-sm font-display font-semibold">Maintenance</div>
                <span className="ml-auto text-xs text-muted-foreground font-mono">{ksh(maintCost)}</span>
                <button onClick={() => setMaintOpen(true)} className="h-8 px-3 rounded-full bg-primary-soft text-primary text-xs font-semibold inline-flex items-center gap-1 press">
                  <Plus className="h-3 w-3" /> Log
                </button>
              </div>
              {maint.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center">No service records yet.</div>
              ) : (
                <div className="space-y-2">
                  {maint.map((m) => (
                    <div key={m.id} className="rounded-2xl border border-border bg-secondary/50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{m.service_type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${m.status === "completed" ? "status-success" : "status-warning"}`}>
                          {m.status}
                        </span>
                        <span className="ml-auto text-[11px] font-mono">{ksh(m.cost)}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {m.service_date}{m.vendor ? ` · ${m.vendor}` : ""}{m.next_due_date ? ` · next ${m.next_due_date}` : ""}
                      </div>
                      {m.description && <div className="text-[11px] mt-1">{m.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "Fuel" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="card-elevated p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Total spend</div>
                  <div className="font-display text-lg font-bold">{ksh(totalFuelCost)}</div>
                </div>
                <div className="card-elevated p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Litres</div>
                  <div className="font-display text-lg font-bold">{totalLitres.toLocaleString()}</div>
                </div>
              </div>
              <div className="card-elevated p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Fuel className="h-4 w-4 text-primary" />
                  <div className="text-sm font-display font-semibold">Fuel logs</div>
                  <button onClick={() => setFuelOpen(true)} className="ml-auto h-8 px-3 rounded-full bg-primary-soft text-primary text-xs font-semibold inline-flex items-center gap-1 press">
                    <Plus className="h-3 w-3" /> Log
                  </button>
                </div>
                {fuel.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center">No fuel entries yet.</div>
                ) : (
                  <div className="space-y-2">
                    {fuel.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 p-3 text-xs">
                        <Gauge className="h-3.5 w-3.5 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{Number(r.litres)} L · {ksh(r.cost)}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {new Date(r.filled_at).toLocaleDateString()}{r.station ? ` · ${r.station}` : ""}
                            {r.odometer_km ? ` · ${r.odometer_km} km` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "Documents" && (
            <div className="card-elevated p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <div className="text-sm font-display font-semibold">Documents</div>
                <label className="ml-auto h-8 px-3 rounded-full bg-primary-soft text-primary text-xs font-semibold inline-flex items-center gap-1 press cursor-pointer">
                  <Plus className="h-3 w-3" /> Upload
                  <input
                    type="file" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !user) return;
                      try {
                        const path = await uploadVehicleMedia(user.id, file, "documents");
                        const { error } = await supabase.from("vehicle_documents").insert({
                          truck_id: v.id, uploaded_by: user.id, kind: "other", label: file.name, file_path: path,
                        });
                        if (error) throw error;
                        toast.success("Document uploaded");
                        load();
                      } catch (err: any) { toast.error(err?.message ?? "Upload failed"); }
                    }}
                  />
                </label>
              </div>
              {docs.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No vehicle documents yet. Add insurance, logbook or inspection certificates.
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 p-3">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold capitalize truncate">
                          {VEHICLE_DOC_KINDS.find((k) => k.key === d.kind)?.label ?? String(d.kind).replace(/_/g, " ")}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{d.label ?? d.file_path}</div>
                      </div>
                      <button onClick={() => viewDoc(d.file_path)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-secondary press" aria-label="View document">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <VehicleStatusSheet vehicle={v} open={statusOpen} onClose={() => setStatusOpen(false)} onChanged={load} />
      <AssignVehicleSheet vehicle={v} open={assignOpen} onClose={() => setAssignOpen(false)} onAssigned={load} />
      <MaintenanceSheet truckId={v.id} open={maintOpen} onClose={() => setMaintOpen(false)} onSaved={load} />
      <FuelSheet truckId={v.id} open={fuelOpen} onClose={() => setFuelOpen(false)} onSaved={load} />
    </DashboardShell>
  );
}

function SheetField({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <input {...rest} className="mt-1 w-full h-12 px-3.5 rounded-2xl bg-secondary/70 border border-border focus:border-primary focus:bg-card outline-none text-sm transition" />
    </label>
  );
}

function MaintenanceSheet({ truckId, open, onClose, onSaved }: { truckId: string; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ service_type: MAINTENANCE_TYPES[0]!, service_date: "", cost: "", vendor: "", odometer_km: "", next_due_date: "", description: "", status: "completed" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("vehicle_maintenance").insert({
      truck_id: truckId, created_by: user?.id ?? null,
      service_type: f.service_type,
      service_date: f.service_date || new Date().toISOString().slice(0, 10),
      cost: f.cost ? Number(f.cost) : null,
      vendor: f.vendor || null,
      odometer_km: f.odometer_km ? Number(f.odometer_km) : null,
      next_due_date: f.next_due_date || null,
      description: f.description || null,
      status: f.status,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Maintenance logged");
    onSaved(); onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Log maintenance">
      <div className="space-y-3">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Service type</span>
          <select value={f.service_type} onChange={set("service_type")} className="mt-1 w-full h-12 px-3 rounded-2xl bg-secondary/70 border border-border outline-none text-sm">
            {MAINTENANCE_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <SheetField label="Service date" type="date" value={f.service_date} onChange={set("service_date")} />
          <SheetField label="Next due" type="date" value={f.next_due_date} onChange={set("next_due_date")} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SheetField label="Cost (KSh)" type="number" value={f.cost} onChange={set("cost")} />
          <SheetField label="Odometer (km)" type="number" value={f.odometer_km} onChange={set("odometer_km")} />
        </div>
        <SheetField label="Vendor / garage" value={f.vendor} onChange={set("vendor")} />
        <SheetField label="Notes" value={f.description} onChange={set("description")} />
        <button onClick={save} disabled={busy} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 shadow-glow press disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save record"}
        </button>
      </div>
    </BottomSheet>
  );
}

function FuelSheet({ truckId, open, onClose, onSaved }: { truckId: string; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({ litres: "", cost: "", station: "", odometer_km: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("vehicle_fuel_logs").insert({
      truck_id: truckId, created_by: user?.id ?? null,
      litres: Number(f.litres) || 0, cost: Number(f.cost) || 0,
      station: f.station || null,
      odometer_km: f.odometer_km ? Number(f.odometer_km) : null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Fuel entry saved");
    onSaved(); onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Log fuel">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SheetField label="Litres" type="number" value={f.litres} onChange={set("litres")} />
          <SheetField label="Cost (KSh)" type="number" value={f.cost} onChange={set("cost")} />
        </div>
        <SheetField label="Station" value={f.station} onChange={set("station")} />
        <SheetField label="Odometer (km)" type="number" value={f.odometer_km} onChange={set("odometer_km")} />
        <button onClick={save} disabled={busy} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 shadow-glow press disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save entry"}
        </button>
      </div>
    </BottomSheet>
  );
}
