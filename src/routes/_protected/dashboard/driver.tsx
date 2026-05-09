import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Power, Star, ShieldCheck, Clock, MapPin, Navigation, Package, Banknote,
  Camera, CheckCircle2, X, FileText, TrendingUp, Truck as TruckIcon,
  ChevronRight, Phone, Upload, Award,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell, StatCard } from "@/components/dashboard/DashboardShell";
import { DriverMap } from "@/components/driver/DriverMap";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { INCOMING_JOBS, COMPLETED_JOBS, STAGE_FLOW, type JobRequest, type JobStage } from "@/lib/driver-data";

export const Route = createFileRoute("/_protected/dashboard/driver")({ component: DriverDashboard });

type Tab = "jobs" | "earnings" | "truck";

function DriverDashboard() {
  const { user } = useAuth();
  const [online, setOnline] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("jobs");

  // Live job state
  const [incoming, setIncoming] = useState<JobRequest[]>([]);
  const [activeJob, setActiveJob] = useState<JobRequest | null>(null);
  const [stage, setStage] = useState<JobStage>("accepted");
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [proofUploaded, setProofUploaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("driver_profiles").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setProfile(data); setOnline(data?.is_online ?? false); });
  }, [user]);

  // Simulate incoming requests when online
  useEffect(() => {
    if (!online || activeJob) { setIncoming([]); return; }
    setIncoming([INCOMING_JOBS[0]]);
    const t = setTimeout(() => setIncoming(INCOMING_JOBS), 2500);
    return () => clearTimeout(t);
  }, [online, activeJob]);

  async function toggleOnline() {
    if (!user) return;
    const next = !online;
    setOnline(next);
    await supabase.from("driver_profiles").update({ is_online: next }).eq("user_id", user.id);
    toast[next ? "success" : "message"](next ? "You're online — receiving jobs" : "You're offline");
  }

  function acceptJob(job: JobRequest) {
    setActiveJob(job);
    setStage("accepted");
    setIncoming([]);
    setProofUploaded(false);
    toast.success(`Accepted: ${job.machine}`);
  }

  function rejectJob(jobId: string) {
    setIncoming((prev) => prev.filter((j) => j.id !== jobId));
    toast("Job declined");
  }

  function advanceStage() {
    const idx = STAGE_FLOW.findIndex((s) => s.id === stage);
    if (idx < 0) return;
    if (stage === "delivered" && !proofUploaded) {
      toast.error("Upload proof of delivery first");
      return;
    }
    const next = STAGE_FLOW[idx + 1];
    if (!next) return;
    if (next.id === "completed") {
      toast.success(`Trip completed — KSh ${activeJob?.price.toLocaleString()} added to earnings`);
      setActiveJob(null);
      setStage("accepted");
      setProofUploaded(false);
      return;
    }
    setStage(next.id);
  }

  function uploadPhoto(label: string) {
    setLoadingPhoto(true);
    setTimeout(() => {
      setLoadingPhoto(false);
      if (label === "proof") setProofUploaded(true);
      toast.success(`${label === "proof" ? "Proof of delivery" : "Photo"} uploaded`);
    }, 800);
  }

  const earnings = useMemo(() => {
    const today = 18400;
    const week = COMPLETED_JOBS.reduce((s, j) => s + j.price, 0);
    const trips = COMPLETED_JOBS.length;
    const rating = (COMPLETED_JOBS.reduce((s, j) => s + j.rating, 0) / trips).toFixed(1);
    return { today, week, trips, rating };
  }, []);

  return (
    <DashboardShell title="Driver dashboard" role="Operator">
      {/* Online toggle */}
      <button
        onClick={toggleOnline}
        className={`w-full glass-strong rounded-2xl p-5 mb-3 flex items-center gap-4 border transition-all ${
          online ? "border-primary bg-primary/10" : "border-border"
        }`}
      >
        <div className={`relative h-12 w-12 rounded-full grid place-items-center ${online ? "bg-primary" : "bg-white/10"}`}>
          <Power className={`h-5 w-5 ${online ? "text-primary-foreground" : ""}`} strokeWidth={2.5} />
          {online && <div className="absolute inset-0 rounded-full pulse-ring opacity-50" />}
        </div>
        <div className="flex-1 text-left">
          <div className="font-display text-lg font-bold">{online ? "You're online" : "You're offline"}</div>
          <div className="text-xs text-muted-foreground">
            {activeJob ? "On an active trip" : online ? "Receiving nearby transport requests" : "Tap to start receiving jobs"}
          </div>
        </div>
        <div className={`text-xs font-mono px-2 py-1 rounded ${online ? "bg-primary/20 text-primary" : "bg-white/10 text-muted-foreground"}`}>
          {online ? "LIVE" : "OFF"}
        </div>
      </button>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 glass rounded-xl p-1 mb-4 text-xs font-medium">
        {(["jobs", "earnings", "truck"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-2 rounded-lg transition-colors capitalize ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "jobs" && (
          <motion.div key="jobs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {activeJob ? (
              <ActiveJobView
                job={activeJob}
                stage={stage}
                onAdvance={advanceStage}
                onUploadPhoto={uploadPhoto}
                loadingPhoto={loadingPhoto}
                proofUploaded={proofUploaded}
              />
            ) : online ? (
              incoming.length ? (
                <div className="space-y-3">
                  <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    {incoming.length} incoming request{incoming.length > 1 ? "s" : ""}
                  </div>
                  {incoming.map((job) => (
                    <JobRequestCard key={job.id} job={job} onAccept={() => acceptJob(job)} onReject={() => rejectJob(job.id)} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Navigation className="h-6 w-6" />} title="Listening for jobs…" sub="We'll notify you when a client requests a low-loader nearby." />
              )
            ) : (
              <EmptyState icon={<Power className="h-6 w-6" />} title="You're offline" sub="Go online to start receiving transport requests." />
            )}
          </motion.div>
        )}

        {tab === "earnings" && (
          <motion.div key="earn" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <EarningsView earnings={earnings} />
          </motion.div>
        )}

        {tab === "truck" && (
          <motion.div key="truck" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <TruckView profile={profile} />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}

/* ---------- Job request card ---------- */
function JobRequestCard({ job, onAccept, onReject }: { job: JobRequest; onAccept: () => void; onReject: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-strong rounded-2xl p-4 border border-primary/30 shadow-[0_0_30px_-12px_var(--safety-glow)]"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 rounded-xl bg-primary/15 grid place-items-center text-2xl shrink-0">{job.machineIcon}</div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">{job.machine}</div>
            <div className="text-xs text-muted-foreground truncate">{job.client} · ★ {job.clientRating}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-xl font-bold text-primary">KSh {job.price.toLocaleString()}</div>
          <div className="text-[10px] font-mono text-muted-foreground">{job.paymentMethod.toUpperCase()}</div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <RouteRow color="primary" label="PICKUP" place={job.pickup} area={job.pickupArea} />
        <div className="ml-1.5 h-3 w-px bg-border" />
        <RouteRow color="muted" label="DROPOFF" place={job.dropoff} area={job.dropoffArea} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <Pill icon={<Package className="h-3 w-3" />} label={`${job.weightTons}T`} />
        <Pill icon={<Navigation className="h-3 w-3" />} label={`${job.distanceKm} km`} />
        <Pill icon={<Clock className="h-3 w-3" />} label={`${job.etaMin} min`} />
      </div>

      {job.notes && <div className="text-xs text-muted-foreground bg-white/5 rounded-lg p-2 mb-3 border-l-2 border-primary/40">{job.notes}</div>}

      <div className="flex gap-2">
        <button onClick={onReject} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-white/5 transition flex items-center justify-center gap-1">
          <X className="h-4 w-4" /> Decline
        </button>
        <button onClick={onAccept} className="flex-[2] h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition flex items-center justify-center gap-1">
          <CheckCircle2 className="h-4 w-4" /> Accept job
        </button>
      </div>
    </motion.div>
  );
}

/* ---------- Active job view ---------- */
function ActiveJobView({
  job, stage, onAdvance, onUploadPhoto, loadingPhoto, proofUploaded,
}: {
  job: JobRequest; stage: JobStage; onAdvance: () => void;
  onUploadPhoto: (label: string) => void; loadingPhoto: boolean; proofUploaded: boolean;
}) {
  const current = STAGE_FLOW.find((s) => s.id === stage)!;
  const idx = STAGE_FLOW.findIndex((s) => s.id === stage);
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 border border-primary/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <div className="text-[10px] font-mono uppercase tracking-widest text-primary">Active trip · {job.id}</div>
          </div>
          <div className="text-xs font-mono text-muted-foreground">KSh {job.price.toLocaleString()}</div>
        </div>

        <div className="font-display text-lg font-bold mb-0.5">{current.label}</div>
        <div className="text-xs text-muted-foreground mb-3">Step {idx + 1} of {STAGE_FLOW.length - 1}</div>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {STAGE_FLOW.slice(0, -1).map((s, i) => (
            <div key={s.id} className={`h-1 flex-1 rounded-full ${i <= idx ? "bg-primary" : "bg-white/10"}`} />
          ))}
        </div>

        <DriverMap pickup={job.pickup} dropoff={job.dropoff} />

        <div className="grid grid-cols-2 gap-2 mt-3">
          <a href="#" className="h-11 rounded-xl glass border border-border text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/5">
            <Phone className="h-4 w-4" /> Call client
          </a>
          <a href="#" className="h-11 rounded-xl glass border border-border text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/5">
            <Navigation className="h-4 w-4" /> Open in maps
          </a>
        </div>
      </div>

      {/* Photo upload at relevant stages */}
      {(stage === "loading" || stage === "delivered") && (
        <div className="glass rounded-2xl p-4">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
            {stage === "loading" ? "Loading photos" : "Proof of delivery"}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => onUploadPhoto(stage === "delivered" ? "proof" : "load")}
                className="aspect-square rounded-xl border border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition grid place-items-center text-muted-foreground"
              >
                {loadingPhoto ? <Upload className="h-5 w-5 animate-pulse" /> : <Camera className="h-5 w-5" />}
              </button>
            ))}
          </div>
          {stage === "delivered" && (
            <div className={`mt-3 text-xs flex items-center gap-2 ${proofUploaded ? "text-primary" : "text-muted-foreground"}`}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {proofUploaded ? "Proof uploaded — ready to complete" : "Upload at least one photo + signature shot"}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onAdvance}
        className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 shadow-[0_0_30px_-8px_var(--safety-glow)] flex items-center justify-center gap-2"
      >
        {current.cta} <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- Earnings ---------- */
function EarningsView({ earnings }: { earnings: { today: number; week: number; trips: number; rating: string } }) {
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-5 bg-gradient-to-br from-primary/15 to-transparent border border-primary/30">
        <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">Available payout</div>
        <div className="font-display text-4xl font-black">KSh {(earnings.week + earnings.today).toLocaleString()}</div>
        <div className="text-xs text-muted-foreground mt-1">Next M-Pesa payout · Friday 18:00</div>
        <button className="mt-3 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-2">
          <Banknote className="h-4 w-4" /> Withdraw to M-Pesa
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Today" value={`KSh ${earnings.today.toLocaleString()}`} sub="earned" />
        <StatCard label="This week" value={`KSh ${earnings.week.toLocaleString()}`} sub="earned" />
        <StatCard label="Trips" value={String(earnings.trips)} sub="completed" />
        <StatCard label="Rating" value={`★ ${earnings.rating}`} sub="from clients" />
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Recent trips</div>
          <button className="text-xs text-primary">View all</button>
        </div>
        <div className="divide-y divide-border">
          {COMPLETED_JOBS.map((j) => (
            <div key={j.id} className="py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 grid place-items-center"><TruckIcon className="h-4 w-4 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{j.route}</div>
                <div className="text-[11px] text-muted-foreground">{j.date} · {j.machine}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">KSh {j.price.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-current" /> {j.rating}.0</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center">
          <Award className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Top driver bonus</div>
          <div className="text-xs text-muted-foreground">3 more trips this week unlocks +KSh 2,500</div>
        </div>
        <TrendingUp className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

/* ---------- Truck ---------- */
function TruckView({ profile }: { profile: any }) {
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Your truck</div>
        {profile ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-14 w-14 rounded-xl bg-primary/15 grid place-items-center text-3xl">🚛</div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-lg font-bold truncate">{profile.vehicle_make} {profile.vehicle_model}</div>
                <div className="text-xs text-muted-foreground">{profile.plate} · {profile.capacity_tons}T capacity</div>
              </div>
              <div className={`text-[10px] font-mono px-2 py-1 rounded inline-flex items-center gap-1 ${
                profile.verified ? "bg-primary/15 text-primary" : "bg-white/10 text-muted-foreground"
              }`}>
                <ShieldCheck className="h-3 w-3" /> {profile.verified ? "VERIFIED" : "PENDING"}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Capacity" value={`${profile.capacity_tons ?? 0}T`} />
              <StatCard label="Experience" value={`${profile.years_experience ?? 0} yrs`} />
            </div>
          </>
        ) : <div className="text-sm text-muted-foreground">Loading…</div>}
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Documents</div>
          <Link to="/onboarding/documents" className="text-xs text-primary inline-flex items-center gap-1">
            Update <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="space-y-2">
          {[
            { name: "Driving license", status: "VERIFIED" },
            { name: "Truck logbook", status: "VERIFIED" },
            { name: "Insurance", status: "EXPIRES 14 DAYS" },
            { name: "NTSA inspection", status: "VERIFIED" },
          ].map((d) => (
            <div key={d.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 text-sm">{d.name}</div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                d.status === "VERIFIED" ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-400"
              }`}>{d.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">Availability</div>
        <div className="space-y-2 text-sm">
          {["Mon–Fri 06:00–20:00", "Saturday 07:00–17:00", "Sunday — Off"].map((s) => (
            <div key={s} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <span>{s}</span>
              <span className="text-[10px] font-mono text-primary">ACTIVE</span>
            </div>
          ))}
        </div>
        <button className="mt-3 w-full h-10 rounded-lg border border-border text-sm hover:bg-white/5">Edit schedule</button>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function RouteRow({ color, label, place, area }: { color: "primary" | "muted"; label: string; place: string; area: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${color === "primary" ? "bg-primary ring-2 ring-primary/30" : "bg-muted-foreground/60"}`} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono text-muted-foreground tracking-widest">{label}</div>
        <div className="text-sm font-medium truncate">{place}</div>
        <div className="text-[11px] text-muted-foreground">{area}</div>
      </div>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-lg bg-white/5 border border-border px-2 py-1.5 flex items-center justify-center gap-1 font-mono">
      {icon}{label}
    </div>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <div className="h-12 w-12 mx-auto rounded-full bg-white/5 grid place-items-center text-muted-foreground mb-3">{icon}</div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
