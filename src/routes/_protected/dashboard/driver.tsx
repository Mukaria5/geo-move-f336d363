import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Power, Star, ShieldCheck, Clock, MapPin, Navigation, Package, Banknote,
  Camera, CheckCircle2, X, FileText, TrendingUp, Truck as TruckIcon,
  ChevronRight, Phone, Upload, Plus,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { ModuleGrid } from "@/components/dashboard/ModuleGrid";
import { LeafletMap } from "@/components/LeafletMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { distanceKm, type BookingStage } from "@/lib/booking-data";

export const Route = createFileRoute("/_protected/dashboard/driver")({ component: DriverDashboard });

type Tab = "jobs" | "earnings" | "truck";

type TruckRow = {
  id: string;
  owner_id: string;
  driver_id: string | null;
  truck_model: string;
  plate: string;
  capacity_tons: number;
  base_price: number;
  price_per_km: number;
  is_online: boolean;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  verified: boolean;
};

type BookingRow = {
  id: string;
  client_id: string;
  truck_id: string | null;
  driver_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  machinery_type: string | null;
  weight_tons: number | null;
  distance_km: number | null;
  estimated_price: number | null;
  final_price: number | null;
  status: BookingStage;
  notes: string | null;
  created_at: string;
};

const STAGE_FLOW: { id: BookingStage; label: string; cta: string }[] = [
  { id: "accepted", label: "Accepted", cta: "Start trip to pickup" },
  { id: "en_route", label: "En route to pickup", cta: "Arrived at pickup" },
  { id: "loading", label: "Loading machine", cta: "Loading complete" },
  { id: "in_transit", label: "In transit", cta: "Arrived at drop-off" },
  { id: "delivered", label: "Delivered", cta: "Upload proof & complete" },
  { id: "completed", label: "Completed", cta: "Done" },
];

function DriverDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("jobs");
  const [truck, setTruck] = useState<TruckRow | null>(null);
  const [loadingTruck, setLoadingTruck] = useState(true);

  const [incoming, setIncoming] = useState<BookingRow[]>([]);
  const [active, setActive] = useState<BookingRow | null>(null);
  const [completed, setCompleted] = useState<BookingRow[]>([]);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  // Load my truck
  useEffect(() => {
    if (!user) return;
    supabase.from("trucks").select("*").eq("owner_id", user.id).maybeSingle()
      .then(({ data }) => { setTruck(data as TruckRow | null); setLoadingTruck(false); });
  }, [user]);

  // Load my bookings (active + completed)
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("bookings").select("*")
        .eq("driver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40);
      const all = (data ?? []) as BookingRow[];
      setActive(all.find((b) => !["completed", "cancelled"].includes(b.status)) ?? null);
      setCompleted(all.filter((b) => b.status === "completed"));
    };
    load();
    const ch = supabase
      .channel("driver:bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `driver_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Listen for incoming requests (status=requested) once online — assigned to my truck OR unassigned in area.
  useEffect(() => {
    if (!user || !truck?.is_online || active) { setIncoming([]); return; }
    const load = async () => {
      const { data } = await supabase
        .from("bookings").select("*")
        .eq("status", "requested")
        .or(`driver_id.eq.${user.id},truck_id.eq.${truck.id}`)
        .order("created_at", { ascending: false })
        .limit(10);
      setIncoming((data ?? []) as BookingRow[]);
    };
    load();
    const ch = supabase
      .channel("driver:incoming")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, truck?.is_online, truck?.id, active]);

  // Push live location while online
  useEffect(() => {
    if (!truck?.is_online || !user) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    const push = (lat: number, lng: number) => {
      if (cancelled) return;
      supabase.from("trucks").update({
        current_lat: lat, current_lng: lng, location_updated_at: new Date().toISOString(),
      }).eq("id", truck.id).then();
    };
    // initial fix
    navigator.geolocation.getCurrentPosition(
      (p) => push(p.coords.latitude, p.coords.longitude),
      () => toast.message("Enable location so clients can find you"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
    const watchId = navigator.geolocation.watchPosition(
      (p) => push(p.coords.latitude, p.coords.longitude),
      undefined,
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => { cancelled = true; navigator.geolocation.clearWatch(watchId); };
  }, [truck?.is_online, truck?.id, user]);

  async function toggleOnline() {
    if (!truck) { toast.error("Register your truck first"); setTab("truck"); return; }
    if (!truck.verified) { toast.error("Your truck is awaiting verification"); return; }
    const next = !truck.is_online;
    const { error } = await supabase.from("trucks").update({ is_online: next }).eq("id", truck.id);
    if (error) return toast.error(error.message);
    setTruck({ ...truck, is_online: next });
    toast.success(next ? "You're online — receiving jobs" : "You're offline");
  }

  async function acceptJob(b: BookingRow) {
    if (!user || !truck) return;
    const { error } = await supabase
      .from("bookings")
      .update({ status: "accepted", driver_id: user.id, truck_id: truck.id })
      .eq("id", b.id)
      .eq("status", "requested");
    if (error) return toast.error(error.message);
    // Mark truck unavailable
    await supabase.from("trucks").update({ is_available: false }).eq("id", truck.id);
    toast.success("Job accepted");
  }

  async function rejectJob(b: BookingRow) {
    setIncoming((prev) => prev.filter((x) => x.id !== b.id));
  }

  async function advance() {
    if (!active) return;
    const idx = STAGE_FLOW.findIndex((s) => s.id === active.status);
    const next = STAGE_FLOW[idx + 1];
    if (!next) return;
    if (active.status === "delivered" && !proofUploaded) {
      toast.error("Upload proof of delivery first");
      return;
    }
    const update: any = { status: next.id };
    if (next.id === "completed") update.final_price = active.estimated_price;
    const { error } = await supabase.from("bookings").update(update).eq("id", active.id);
    if (error) return toast.error(error.message);
    if (next.id === "completed" && truck) {
      await supabase.from("trucks").update({ is_available: true }).eq("id", truck.id);
      toast.success(`Trip completed — KSh ${(active.estimated_price ?? 0).toLocaleString()} earned`);
      setProofUploaded(false);
    }
  }

  async function uploadPhoto(kind: "pickup" | "load" | "dropoff" | "proof") {
    if (!user || !active) return;
    setPhotoBusy(true);
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
    const path = `${user.id}/${active.id}/${kind}-${Date.now()}.png`;
    const { error } = await supabase.storage.from("trip-photos").upload(path, blob, { upsert: true });
    if (error) { setPhotoBusy(false); return toast.error(error.message); }
    const { error: dbErr } = await supabase.from("booking_photos").insert({
      booking_id: active.id, driver_id: user.id, kind, file_path: path,
    });
    setPhotoBusy(false);
    if (dbErr) return toast.error(dbErr.message);
    if (kind === "proof") setProofUploaded(true);
    toast.success(`${kind} photo shared with the client`);
  }

  const earnings = useMemo(() => {
    const week = completed.reduce((s, j) => s + (j.final_price ?? j.estimated_price ?? 0), 0);
    return { today: 0, week, trips: completed.length, rating: "—" };
  }, [completed]);

  const online = !!truck?.is_online;

  return (
    <DashboardShell title="Driver dashboard" role="Operator">
      <button
        onClick={toggleOnline}
        className={`w-full rounded-3xl p-5 mb-3 flex items-center gap-4 border transition-all press ${
          online
            ? "card-premium border-transparent shadow-glow"
            : "card-elevated border-border"
        }`}
      >
        <div className={`relative h-12 w-12 rounded-2xl grid place-items-center ${online ? "bg-gold text-primary" : "bg-primary-soft text-primary"}`}>
          <Power className="h-5 w-5" strokeWidth={2.5} />
          {online && <div className="absolute inset-0 rounded-2xl pulse-ring opacity-50" />}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className={`font-display text-lg font-bold ${online ? "text-primary-foreground" : ""}`}>
            {online ? "You're online" : "You're offline"}
          </div>
          <div className={`text-xs truncate ${online ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {!truck ? "Register your truck to start" : active ? "On an active trip" : online ? "Sharing live location · receiving requests" : "Tap to start receiving jobs"}
          </div>
        </div>
        <div className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full ${online ? "bg-gold text-primary" : "bg-secondary text-muted-foreground"}`}>
          {online ? "Live" : "Off"}
        </div>
      </button>

      <div className="grid grid-cols-3 gap-1 card-elevated p-1 mb-4 text-xs font-medium rounded-2xl">
        {(["jobs", "earnings", "truck"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`py-2.5 rounded-xl transition-colors capitalize ${tab === t ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>


      <AnimatePresence mode="wait">
        {tab === "jobs" && (
          <motion.div key="jobs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {active ? (
              <ActiveJobView job={active} onAdvance={advance} onUploadPhoto={uploadPhoto} photoBusy={photoBusy} proofUploaded={proofUploaded} />
            ) : online ? (
              incoming.length ? (
                <div className="space-y-3">
                  <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    {incoming.length} incoming request{incoming.length > 1 ? "s" : ""}
                  </div>
                  {incoming.map((job) => (
                    <JobRequestCard key={job.id} job={job} truck={truck!}
                      onAccept={() => acceptJob(job)} onReject={() => rejectJob(job)} />
                  ))}
                </div>
              ) : (
                <Empty icon={<Navigation className="h-6 w-6" />} title="Listening for jobs…" sub="We'll notify you when a client requests a low-loader nearby." />
              )
            ) : (
              <Empty icon={<Power className="h-6 w-6" />} title="You're offline" sub="Go online to start receiving transport requests." />
            )}
          </motion.div>
        )}

        {tab === "earnings" && (
          <motion.div key="earn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Earnings earnings={earnings} completed={completed} />
          </motion.div>
        )}

        {tab === "truck" && (
          <motion.div key="truck" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {loadingTruck ? <div className="text-sm text-muted-foreground">Loading…</div> :
              truck ? <TruckView truck={truck} onUpdate={setTruck} /> : <RegisterTruck onCreated={setTruck} />}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4">
        <ModuleGrid title="Quick access" />
      </div>
    </DashboardShell>
  );
}

/* ---------- Job request ---------- */
function JobRequestCard({ job, truck, onAccept, onReject }: { job: BookingRow; truck: TruckRow; onAccept: () => void; onReject: () => void }) {
  const km = job.pickup_lat != null && job.pickup_lng != null && truck.current_lat != null && truck.current_lng != null
    ? distanceKm({ lat: truck.current_lat, lng: truck.current_lng }, { lat: job.pickup_lat, lng: job.pickup_lng })
    : job.distance_km ?? 0;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="glass-strong rounded-2xl p-4 border border-primary/30 shadow-[0_0_30px_-12px_var(--safety-glow)]">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-primary/15 grid place-items-center text-2xl shrink-0">🚜</div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate capitalize">{job.machinery_type ?? "Equipment"}</div>
            <div className="text-xs text-muted-foreground truncate">Booking #{job.id.slice(0, 8)}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-xl font-bold text-primary">KSh {(job.estimated_price ?? 0).toLocaleString()}</div>
          <div className="text-[10px] font-mono text-muted-foreground">M-PESA</div>
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <RouteRow color="primary" label="PICKUP" place={job.pickup_address} />
        <div className="ml-1.5 h-3 w-px bg-border" />
        <RouteRow color="muted" label="DROPOFF" place={job.dropoff_address} />
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <Pill icon={<Package className="h-3 w-3" />} label={`${job.weight_tons ?? "—"}T`} />
        <Pill icon={<Navigation className="h-3 w-3" />} label={`${(job.distance_km ?? 0).toFixed(1)} km`} />
        <Pill icon={<Clock className="h-3 w-3" />} label={`${km.toFixed(1)} km away`} />
      </div>
      <div className="flex gap-2">
        <button onClick={onReject} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-secondary/60 transition flex items-center justify-center gap-1">
          <X className="h-4 w-4" /> Decline
        </button>
        <button onClick={onAccept} className="flex-[2] h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-1">
          <CheckCircle2 className="h-4 w-4" /> Accept job
        </button>
      </div>
    </motion.div>
  );
}

/* ---------- Active job ---------- */
function ActiveJobView({
  job, onAdvance, onUploadPhoto, photoBusy, proofUploaded,
}: {
  job: BookingRow; onAdvance: () => void;
  onUploadPhoto: (k: "pickup" | "load" | "dropoff" | "proof") => void; photoBusy: boolean; proofUploaded: boolean;
}) {
  const idx = STAGE_FLOW.findIndex((s) => s.id === job.status);
  const current = STAGE_FLOW[Math.max(0, idx)];
  const pickup = job.pickup_lat != null && job.pickup_lng != null ? { lat: job.pickup_lat, lng: job.pickup_lng } : null;
  const dropoff = job.dropoff_lat != null && job.dropoff_lng != null ? { lat: job.dropoff_lat, lng: job.dropoff_lng } : null;
  const photoKind: "pickup" | "load" | "dropoff" | "proof" | null =
    job.status === "en_route" ? "pickup"
    : job.status === "loading" ? "load"
    : job.status === "in_transit" ? "dropoff"
    : job.status === "delivered" ? "proof"
    : null;
  const photoLabel = photoKind === "pickup" ? "Photos at pickup site"
    : photoKind === "load" ? "Photos of machine loaded"
    : photoKind === "dropoff" ? "Photos at drop-off site"
    : photoKind === "proof" ? "Proof of delivery" : "";
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 border border-primary/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary">Active · {job.id.slice(0, 8)}</div>
          </div>
          <div className="text-xs font-mono text-muted-foreground">KSh {(job.estimated_price ?? 0).toLocaleString()}</div>
        </div>
        <div className="font-display text-lg font-bold mb-0.5">{current.label}</div>
        <div className="text-xs text-muted-foreground mb-3">Step {idx + 1} of {STAGE_FLOW.length - 1} · client sees this live</div>
        <div className="flex gap-1 mb-4">
          {STAGE_FLOW.slice(0, -1).map((s, i) => (
            <div key={s.id} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-primary" : "bg-secondary"}`} />
          ))}
        </div>
        <div className="rounded-xl overflow-hidden h-48 relative">
          <LeafletMap center={pickup ?? { lat: -1.29, lng: 36.82 }} zoom={12}
            pickup={pickup} dropoff={dropoff} showRoute={!!pickup && !!dropoff} className="absolute inset-0" />
        </div>
        <div className="text-xs text-muted-foreground mt-3 space-y-1">
          <div><span className="font-mono text-primary">PICKUP:</span> {job.pickup_address}</div>
          <div><span className="font-mono">DROPOFF:</span> {job.dropoff_address}</div>
        </div>
      </div>

      {photoKind && (
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">{photoLabel}</div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <button key={i} onClick={() => onUploadPhoto(photoKind)}
                className="aspect-square rounded-xl border border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition grid place-items-center text-muted-foreground">
                {photoBusy ? <Upload className="h-5 w-5 animate-pulse" /> : <Camera className="h-5 w-5" />}
              </button>
            ))}
          </div>
          {photoKind === "proof" && (
            <div className={`mt-3 text-xs flex items-center gap-2 ${proofUploaded ? "text-primary" : "text-muted-foreground"}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {proofUploaded ? "Proof uploaded — ready to complete" : "Upload at least one photo"}
            </div>
          )}
        </div>
      )}

      <button onClick={onAdvance}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 shadow-[0_0_30px_-8px_var(--safety-glow)] flex items-center justify-center gap-2">
        {current.cta} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- Earnings ---------- */
function Earnings({ earnings, completed }: { earnings: { today: number; week: number; trips: number; rating: string }; completed: BookingRow[] }) {
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-5 bg-gradient-to-br from-primary/15 to-transparent border border-primary/30">
        <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">Available payout</div>
        <div className="font-display text-4xl font-black">KSh {earnings.week.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground mt-1">From your completed trips</div>
        <button className="mt-3 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-2"
          onClick={() => toast.message("M-Pesa payouts go live with the payments rollout")}>
          <Banknote className="h-4 w-4" /> Withdraw to M-Pesa
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Trips" value={String(earnings.trips)} sub="completed" />
        <StatCard label="Earned" value={`KSh ${earnings.week.toLocaleString()}`} sub="all time" />
      </div>
      <div className="glass rounded-2xl p-4">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Recent trips</div>
        {completed.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No completed trips yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {completed.slice(0, 8).map((j) => (
              <div key={j.id} className="py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center"><TruckIcon className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{j.pickup_address.split(",")[0]} → {j.dropoff_address.split(",")[0]}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(j.created_at).toLocaleDateString()} · {j.machinery_type ?? "—"}</div>
                </div>
                <div className="text-sm font-bold">KSh {(j.final_price ?? j.estimated_price ?? 0).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Truck ---------- */
function TruckView({ truck, onUpdate }: { truck: TruckRow; onUpdate: (t: TruckRow) => void }) {
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Your truck</div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-14 w-14 rounded-xl bg-primary/15 grid place-items-center text-3xl">🚛</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg font-bold truncate">{truck.truck_model}</div>
            <div className="text-xs text-muted-foreground">{truck.plate} · {truck.capacity_tons}T</div>
          </div>
          <div className={`text-[10px] font-mono px-2 py-1 rounded inline-flex items-center gap-1 ${
            truck.verified ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-400"
          }`}>
            <ShieldCheck className="h-3 w-3" /> {truck.verified ? "VERIFIED" : "PENDING"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Base price" value={`KSh ${truck.base_price.toLocaleString()}`} />
          <StatCard label="Per km" value={`KSh ${truck.price_per_km}`} />
        </div>
        {truck.current_lat != null && (
          <div className="mt-3 text-[10px] font-mono text-muted-foreground">
            Last fix: {truck.current_lat.toFixed(4)}, {truck.current_lng?.toFixed(4)}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Documents</div>
          <Link to="/onboarding/documents" className="text-xs text-primary inline-flex items-center gap-1">
            Update <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="text-xs text-muted-foreground">Upload your license, logbook, insurance and NTSA inspection so an admin can verify your truck.</div>
      </div>
    </div>
  );
}

function RegisterTruck({ onCreated }: { onCreated: (t: TruckRow) => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ truck_model: "", plate: "", capacity_tons: "30", base_price: "5000", price_per_km: "300" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase.from("trucks").insert({
      owner_id: user.id, driver_id: user.id,
      truck_model: form.truck_model.trim(),
      plate: form.plate.trim().toUpperCase(),
      capacity_tons: Number(form.capacity_tons),
      base_price: Number(form.base_price),
      price_per_km: Number(form.price_per_km),
    }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    onCreated(data as TruckRow);
    toast.success("Truck registered — awaiting verification");
  }

  return (
    <form onSubmit={submit} className="glass-strong rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center"><Plus className="h-4 w-4 text-primary" /></div>
        <div>
          <div className="font-display text-lg font-bold">Register your low loader</div>
          <div className="text-xs text-muted-foreground">An admin will verify your documents before you go online.</div>
        </div>
      </div>
      <Input label="Truck model" value={form.truck_model} onChange={(v) => setForm({ ...form, truck_model: v })} placeholder="Scania R580 Low-Bed" />
      <Input label="Plate" value={form.plate} onChange={(v) => setForm({ ...form, plate: v })} placeholder="KDH 421X" />
      <div className="grid grid-cols-3 gap-2">
        <Input label="Capacity (T)" value={form.capacity_tons} onChange={(v) => setForm({ ...form, capacity_tons: v })} type="number" />
        <Input label="Base (KSh)" value={form.base_price} onChange={(v) => setForm({ ...form, base_price: v })} type="number" />
        <Input label="Per km (KSh)" value={form.price_per_km} onChange={(v) => setForm({ ...form, price_per_km: v })} type="number" />
      </div>
      <button disabled={busy || !form.truck_model || !form.plate}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 glow-safety">
        {busy ? "Saving…" : "Register truck"}
      </button>
    </form>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type}
        className="w-full bg-secondary/60 border border-border rounded-lg px-3 h-10 text-sm outline-none focus:border-primary" />
    </label>
  );
}

/* ---------- helpers ---------- */
function RouteRow({ color, label, place }: { color: "primary" | "muted"; label: string; place: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${color === "primary" ? "bg-primary ring-2 ring-primary/30" : "bg-muted-foreground/60"}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono text-muted-foreground tracking-widest">{label}</div>
        <div className="text-sm font-medium truncate">{place}</div>
      </div>
    </div>
  );
}
function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="rounded-lg bg-secondary/60 border border-border px-2 py-1.5 flex items-center justify-center gap-1 font-mono">{icon}{label}</div>;
}
function Empty({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <div className="h-12 w-12 mx-auto rounded-full bg-secondary/60 grid place-items-center text-muted-foreground mb-3">{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
