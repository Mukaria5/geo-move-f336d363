import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, MapPin, IdCard, Truck as TruckIcon, Star, Upload, FileText, Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DriverAvatar, DriverStatusChip } from "@/components/drivers/DriverCard";
import { DriverStatusSheet } from "@/components/drivers/DriverStatusSheet";
import { AssignDriverVehicleSheet } from "@/components/drivers/AssignDriverVehicleSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { openDriverMedia, uploadDriverMedia } from "@/lib/driver-media";
import {
  DRIVER_DOC_KINDS, DRIVER_STATUS_META, daysUntil, onTimeRate, type DriverRow,
} from "@/lib/driver-data-model";

export const Route = createFileRoute("/_protected/dashboard/fleet/drivers/$driverId")({
  component: DriverProfile,
});

const TABS = ["Overview", "Licence", "Vehicle", "Performance", "Trips", "Documents"] as const;
type Tab = (typeof TABS)[number];

type DocRow = { id: string; kind: string; label: string | null; file_path: string; expires_on: string | null; created_at: string };
type TripRow = { id: string; order_number: string; status: string; pickup_address: string; dropoff_address: string; created_at: string };
type EventRow = { id: string; status: string; note: string | null; created_at: string };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-sm font-medium text-right">{v}</span>
    </div>
  );
}

function DriverProfile() {
  const { driverId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [vehicle, setVehicle] = useState<{ id: string; plate: string; truck_model: string } | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("drivers").select("*").eq("id", driverId).maybeSingle();
    const d = data as DriverRow | null;
    setDriver(d);
    setLoading(false);
    if (!d) return;

    if (d.assigned_truck_id) {
      const { data: v } = await supabase.from("trucks").select("id, plate, truck_model").eq("id", d.assigned_truck_id).maybeSingle();
      setVehicle((v as any) ?? null);
    } else setVehicle(null);

    const [{ data: dd }, { data: ev }] = await Promise.all([
      supabase.from("driver_documents").select("*").eq("driver_id", d.id).order("created_at", { ascending: false }),
      supabase.from("driver_status_events").select("id, status, note, created_at").eq("driver_id", d.id)
        .order("created_at", { ascending: false }).limit(20),
    ]);
    setDocs((dd as DocRow[]) ?? []);
    setEvents((ev as EventRow[]) ?? []);

    if (d.user_id) {
      const { data: o } = await supabase
        .from("orders")
        .select("id, order_number, status, pickup_address, dropoff_address, created_at")
        .eq("driver_id", d.user_id).order("created_at", { ascending: false }).limit(30);
      setTrips((o as TripRow[]) ?? []);
    } else setTrips([]);
  };

  useEffect(() => { load(); }, [driverId]);

  const licDays = useMemo(() => daysUntil(driver?.licence_expiry ?? null), [driver]);
  const medDays = useMemo(() => daysUntil(driver?.medical_expiry ?? null), [driver]);

  const addDoc = async (file: File) => {
    if (!user || !driver) return;
    setUploading(true);
    try {
      const path = await uploadDriverMedia(user.id, file, "docs");
      const { error } = await supabase.from("driver_documents").insert({
        driver_id: driver.id, uploaded_by: user.id, kind: "other", label: file.name, file_path: path,
      });
      if (error) throw error;
      toast.success("Document uploaded");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Driver" role="Fleet">
        <div className="py-16 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </DashboardShell>
    );
  }
  if (!driver) {
    return (
      <DashboardShell title="Driver" role="Fleet">
        <EmptyState icon={IdCard} title="Driver not found" description="This record may have been removed." />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title={driver.full_name} role="Fleet">
      <button onClick={() => navigate({ to: "/dashboard/fleet/drivers" })} className="inline-flex items-center gap-1 text-xs text-muted-foreground press mb-2">
        <ArrowLeft className="h-3.5 w-3.5" /> All drivers
      </button>

      {/* Hero */}
      <div className="card-premium p-4">
        <div className="flex gap-3">
          <DriverAvatar driver={driver} size={68} />
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg font-semibold truncate">{driver.full_name}</div>
            <div className="text-[11px] text-muted-foreground truncate">
              {driver.employee_id ? `#${driver.employee_id} · ` : ""}{driver.department ?? "Operations"}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <DriverStatusChip status={driver.status} />
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 text-gold fill-gold" />
                {Number(driver.rating) > 0 ? Number(driver.rating).toFixed(1) : "—"}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-1.5">
          {driver.phone && (
            <a href={`tel:${driver.phone}`} className="flex-1 h-11 rounded-2xl bg-secondary grid place-items-center press"><Phone className="h-4 w-4" /></a>
          )}
          <button onClick={() => setAssignOpen(true)} className="flex-1 h-11 rounded-2xl bg-gold text-primary grid place-items-center press"><TruckIcon className="h-4 w-4" /></button>
          <button onClick={() => setStatusOpen(true)} className="flex-[2] h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold press">
            Change status
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 h-9 px-3.5 rounded-full text-xs font-semibold press ${
              tab === t ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card-elevated p-4 mt-3">
        {tab === "Overview" && (
          <div>
            <Row k="Phone" v={driver.phone ?? "—"} />
            <Row k="Email" v={driver.email ?? "—"} />
            <Row k="National ID" v={driver.national_id_no ?? "—"} />
            <Row k="Date of birth" v={driver.date_of_birth ?? "—"} />
            <Row k="Gender" v={driver.gender ?? "—"} />
            <Row k="Blood group" v={driver.blood_group ?? "—"} />
            <Row k="Address" v={driver.address ?? "—"} />
            <Row k="Emergency" v={driver.emergency_contact_name ? `${driver.emergency_contact_name} · ${driver.emergency_contact_phone ?? ""}` : "—"} />
            <Row k="Hired" v={driver.hire_date ?? "—"} />
            <Row k="Employment" v={`${driver.employment_type ?? "—"} · ${driver.employment_status}`} />
            <Row k="Branch" v={driver.branch ?? "—"} />
            {driver.notes && <div className="mt-2 text-xs text-muted-foreground">{driver.notes}</div>}
          </div>
        )}

        {tab === "Licence" && (
          <div>
            <Row k="Licence no." v={driver.licence_no ?? "—"} />
            <Row k="Class" v={driver.licence_class ?? "—"} />
            <Row k="Issued" v={driver.licence_issue_date ?? "—"} />
            <Row k="Expires" v={driver.licence_expiry ?? "—"} />
            <Row k="Medical expiry" v={driver.medical_expiry ?? "—"} />
            <Row k="Experience" v={driver.years_experience ? `${driver.years_experience} years` : "—"} />
            {licDays !== null && licDays <= 45 && (
              <div className={`mt-2 rounded-xl p-3 text-xs ${licDays < 0 ? "status-urgent" : "status-warning"}`}>
                {licDays < 0 ? `Licence expired ${Math.abs(licDays)} days ago — driver cannot be dispatched.` : `Licence expires in ${licDays} days.`}
              </div>
            )}
            {medDays !== null && medDays <= 30 && (
              <div className={`mt-2 rounded-xl p-3 text-xs ${medDays < 0 ? "status-urgent" : "status-warning"}`}>
                {medDays < 0 ? `Medical certificate expired ${Math.abs(medDays)} days ago.` : `Medical certificate expires in ${medDays} days.`}
              </div>
            )}
          </div>
        )}

        {tab === "Vehicle" && (
          <div>
            {vehicle ? (
              <>
                <Row k="Plate" v={vehicle.plate} />
                <Row k="Model" v={vehicle.truck_model} />
                <button
                  onClick={() => navigate({ to: "/dashboard/fleet/vehicles/$vehicleId", params: { vehicleId: vehicle.id } })}
                  className="mt-2 w-full h-11 rounded-2xl bg-secondary text-sm font-semibold press"
                >
                  Open vehicle profile
                </button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No vehicle assigned.</div>
            )}
            <button onClick={() => setAssignOpen(true)} className="mt-2 w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold press">
              {vehicle ? "Reassign vehicle" : "Assign vehicle"}
            </button>
          </div>
        )}

        {tab === "Performance" && (
          <div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-secondary/60 p-3">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Total trips</div>
                <div className="font-display text-2xl font-bold">{driver.total_trips}</div>
              </div>
              <div className="rounded-2xl bg-secondary/60 p-3">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">On time</div>
                <div className="font-display text-2xl font-bold">{onTimeRate(driver)}%</div>
              </div>
              <div className="rounded-2xl bg-secondary/60 p-3">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Distance</div>
                <div className="font-display text-2xl font-bold">{Number(driver.distance_km).toFixed(0)} km</div>
              </div>
              <div className="rounded-2xl bg-secondary/60 p-3">
                <div className="text-[10px] font-mono uppercase text-muted-foreground">Hours driven</div>
                <div className="font-display text-2xl font-bold">{Number(driver.hours_driven).toFixed(0)}</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1.5">On-time performance</div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${onTimeRate(driver)}%` }} />
              </div>
            </div>
            {events.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1.5">Availability history</div>
                <div className="space-y-1.5">
                  {events.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <span className={`h-2 w-2 rounded-full ${DRIVER_STATUS_META[e.status as DriverRow["status"]]?.dot ?? "bg-border"}`} />
                      <span className="font-medium">{DRIVER_STATUS_META[e.status as DriverRow["status"]]?.label ?? e.status}</span>
                      <span className="text-muted-foreground truncate flex-1">{e.note ?? ""}</span>
                      <span className="text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "Trips" && (
          trips.length === 0 ? (
            <div className="text-sm text-muted-foreground">No trips recorded for this driver yet.</div>
          ) : (
            <div className="space-y-2">
              {trips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate({ to: "/dashboard/orders/$orderId", params: { orderId: t.id } })}
                  className="w-full text-left rounded-xl bg-secondary/50 p-3 press"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold font-mono">{t.order_number}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{t.pickup_address} → {t.dropoff_address}</div>
                  <div className="text-[11px] mt-0.5">{t.status.replace(/_/g, " ")}</div>
                </button>
              ))}
            </div>
          )
        )}

        {tab === "Documents" && (
          <div>
            <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground press cursor-pointer">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload document
              <input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addDoc(f); e.target.value = ""; }} />
            </label>
            <div className="mt-2 space-y-1.5">
              {docs.length === 0 && <div className="text-sm text-muted-foreground">No documents uploaded.</div>}
              {docs.map((d) => {
                const exp = daysUntil(d.expires_on);
                return (
                  <button
                    key={d.id}
                    onClick={() => openDriverMedia(d.file_path)}
                    className="w-full flex items-center gap-2 rounded-xl bg-secondary/50 p-3 press text-left"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">
                        {DRIVER_DOC_KINDS.find((k) => k.key === d.kind)?.label ?? d.kind}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">{d.label ?? "Document"}</span>
                    </span>
                    {exp !== null && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${exp < 0 ? "status-urgent" : exp <= 30 ? "status-warning" : "status-info"}`}>
                        {exp < 0 ? "Expired" : `${exp}d`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {driver.current_lat != null && (
        <div className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Last seen {driver.current_lat.toFixed(3)}, {driver.current_lng?.toFixed(3)}
        </div>
      )}
      <div className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <Mail className="h-3 w-3" /> {driver.email ?? "No email on file"}
      </div>

      <DriverStatusSheet driver={driver} open={statusOpen} onClose={() => setStatusOpen(false)} onChanged={load} />
      <AssignDriverVehicleSheet driver={driver} open={assignOpen} onClose={() => setAssignOpen(false)} onAssigned={load} />
    </DashboardShell>
  );
}
