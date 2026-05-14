import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Navigation, ChevronRight, Star, Clock, Truck as TruckIcon,
  Phone, MessageSquare, Shield, Check, Loader2, Search, Crosshair,
} from "lucide-react";
import { toast } from "sonner";
import { LeafletMap } from "@/components/LeafletMap";
import {
  MACHINERY, STAGES, distanceKm, estimatePrice, etaMinutes, geocode,
  type BookingStage, type Truck, type Booking, type GeoResult,
} from "@/lib/booking-data";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a low loader · LoadLink" },
      { name: "description", content: "Request a verified low-loader truck for your machinery — live availability and pricing." },
    ],
  }),
  component: BookPage,
});

type Step = "locations" | "machine" | "trucks" | "tracking";
type LatLng = { lat: number; lng: number };

function BookPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("locations");
  const [pickup, setPickup] = useState<{ address: string; coords: LatLng | null }>({ address: "", coords: null });
  const [dropoff, setDropoff] = useState<{ address: string; coords: LatLng | null }>({ address: "", coords: null });
  const [pickingMap, setPickingMap] = useState<"pickup" | "dropoff" | null>(null);

  const [machine, setMachine] = useState<string | null>(null);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null);
  const [loadingTrucks, setLoadingTrucks] = useState(false);

  const [booking, setBooking] = useState<Booking | null>(null);

  // ----- Live trucks: query verified+online+available, then realtime updates -----
  useEffect(() => {
    if (step !== "trucks" || !pickup.coords) return;
    let cancelled = false;
    setLoadingTrucks(true);
    supabase
      .from("trucks")
      .select("*")
      .eq("is_online", true)
      .eq("is_available", true)
      .eq("verified", true)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error("Could not load trucks: " + error.message);
        setTrucks((data ?? []) as Truck[]);
        setLoadingTrucks(false);
      });
    const channel = supabase
      .channel("public:trucks:book")
      .on("postgres_changes", { event: "*", schema: "public", table: "trucks" }, (payload) => {
        setTrucks((prev) => {
          const next = [...prev];
          const row = payload.new as Truck;
          if (payload.eventType === "DELETE") {
            const old = payload.old as Truck;
            return next.filter((t) => t.id !== old.id);
          }
          const visible = row.is_online && row.is_available && row.verified && row.current_lat != null;
          const idx = next.findIndex((t) => t.id === row.id);
          if (!visible) return idx >= 0 ? next.filter((_, i) => i !== idx) : next;
          if (idx >= 0) next[idx] = row;
          else next.push(row);
          return next;
        });
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [step, pickup.coords]);

  // ----- Realtime updates for booking once created -----
  useEffect(() => {
    if (!booking) return;
    const channel = supabase
      .channel(`booking:${booking.id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${booking.id}` },
        (payload) => setBooking(payload.new as Booking),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [booking?.id]);

  // ----- Simulated driver movement for demo/presentation -----
  // Real DB location is the starting point; from there we animate the truck
  // along: start -> pickup -> dropoff, advancing the booking stage locally.
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  const [simStage, setSimStage] = useState<BookingStage | null>(null);

  useEffect(() => {
    if (!booking?.truck_id || !pickup.coords || !dropoff.coords) {
      setDriverPos(null);
      setSimStage(null);
      return;
    }
    let cancelled = false;
    let raf = 0;
    let timers: any[] = [];

    (async () => {
      const { data } = await supabase
        .from("trucks").select("current_lat,current_lng").eq("id", booking.truck_id!).maybeSingle();
      if (cancelled) return;
      const start: LatLng =
        data?.current_lat != null && data?.current_lng != null
          ? { lat: data.current_lat, lng: data.current_lng }
          : { lat: pickup.coords!.lat - 0.03, lng: pickup.coords!.lng - 0.03 };

      setDriverPos(start);

      const animate = (from: LatLng, to: LatLng, ms: number) =>
        new Promise<void>((resolve) => {
          const t0 = performance.now();
          const tick = (now: number) => {
            if (cancelled) return resolve();
            const p = Math.min(1, (now - t0) / ms);
            // ease-in-out
            const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            setDriverPos({
              lat: from.lat + (to.lat - from.lat) * e,
              lng: from.lng + (to.lng - from.lng) * e,
            });
            if (p < 1) raf = requestAnimationFrame(tick);
            else resolve();
          };
          raf = requestAnimationFrame(tick);
        });

      // Stage timeline (fast, demo-friendly)
      timers.push(setTimeout(() => !cancelled && setSimStage("accepted"), 1500));
      timers.push(setTimeout(() => !cancelled && setSimStage("en_route"), 3000));
      await new Promise((r) => timers.push(setTimeout(r, 3000)));

      // Move to pickup
      await animate(start, pickup.coords!, 12000);
      if (cancelled) return;
      setSimStage("loading");
      await new Promise((r) => timers.push(setTimeout(r, 3500)));
      if (cancelled) return;

      // Move to dropoff
      setSimStage("in_transit");
      await animate(pickup.coords!, dropoff.coords!, 16000);
      if (cancelled) return;

      setSimStage("delivered");
      timers.push(setTimeout(() => !cancelled && setSimStage("completed"), 2500));
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [booking?.truck_id, pickup.coords, dropoff.coords]);

  const trucksWithMeta = useMemo(() => {
    if (!pickup.coords) return [];
    return trucks
      .map((t) => {
        const km = distanceKm({ lat: t.current_lat!, lng: t.current_lng! }, pickup.coords!);
        return {
          truck: t,
          km,
          eta: etaMinutes(km),
          price: estimatePrice(t, distanceKm(pickup.coords!, dropoff.coords ?? pickup.coords!)),
        };
      })
      .sort((a, b) => a.km - b.km);
  }, [trucks, pickup.coords, dropoff.coords]);

  const tripKm = useMemo(() => {
    if (pickup.coords && dropoff.coords) return distanceKm(pickup.coords, dropoff.coords);
    return 0;
  }, [pickup.coords, dropoff.coords]);

  const selected = trucksWithMeta.find((t) => t.truck.id === selectedTruck);
  const stage = (simStage ?? booking?.status ?? "requested") as BookingStage;

  // Map center prefers pickup, falls back to Nairobi
  const center = pickup.coords ?? { lat: -1.2921, lng: 36.8219 };

  async function requestTruck() {
    if (!user) { navigate({ to: "/auth/login", search: { redirect: "/book" } }); return; }
    if (!selected || !pickup.coords || !dropoff.coords) return;
    const insert = {
      client_id: user.id,
      truck_id: selected.truck.id,
      driver_id: selected.truck.driver_id,
      pickup_address: pickup.address,
      pickup_lat: pickup.coords.lat,
      pickup_lng: pickup.coords.lng,
      dropoff_address: dropoff.address,
      dropoff_lat: dropoff.coords.lat,
      dropoff_lng: dropoff.coords.lng,
      machinery_type: machine,
      distance_km: tripKm,
      estimated_price: selected.price,
      status: "requested" as BookingStage,
    };
    const { data, error } = await supabase.from("bookings").insert(insert).select().single();
    if (error) { toast.error(error.message); return; }
    setBooking(data as Booking);
    setStep("tracking");
    toast.success("Request sent to driver");
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="fixed inset-0">
        <LeafletMap
          center={center}
          zoom={pickup.coords ? 13 : 11}
          trucks={step === "trucks" ? trucks.filter((t) => t.current_lat != null) : []}
          pickup={pickup.coords}
          dropoff={dropoff.coords}
          driverPos={step === "tracking" ? driverPos : null}
          selectedTruckId={selectedTruck}
          showRoute={step === "tracking" && !!pickup.coords && !!dropoff.coords}
          onTruckClick={(id) => setSelectedTruck(id)}
          onMapClick={(p) => {
            if (!pickingMap) return;
            if (pickingMap === "pickup") setPickup({ address: `Pin · ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`, coords: p });
            else setDropoff({ address: `Pin · ${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`, coords: p });
            setPickingMap(null);
            toast.success("Location pinned");
          }}
        />
      </div>

      {/* TOP BAR */}
      <div className="relative z-20 px-4 pt-4">
        <div className="glass-strong rounded-2xl flex items-center gap-3 p-3">
          <Link to="/" className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground font-mono">
              {step === "tracking" ? "LIVE TRIP" : "NEW BOOKING"}
            </div>
            <div className="text-sm font-semibold truncate">
              {step === "locations" && "Where do you need the truck?"}
              {step === "machine" && "What are we moving?"}
              {step === "trucks" && (loadingTrucks ? "Searching live trucks…" : `${trucks.length} low loader${trucks.length === 1 ? "" : "s"} live`)}
              {step === "tracking" && (selected ? `${selected.truck.truck_model} · ${selected.truck.plate}` : "Tracking trip")}
            </div>
          </div>
        </div>
        <StepBar step={step} />
        {pickingMap && (
          <div className="mt-2 glass rounded-xl p-2 text-xs text-center text-primary font-medium">
            Tap on the map to set {pickingMap}. <button className="underline ml-2" onClick={() => setPickingMap(null)}>cancel</button>
          </div>
        )}
      </div>

      {/* BOTTOM PANEL */}
      <div className="fixed bottom-0 inset-x-0 z-20">
        <AnimatePresence mode="wait">
          {step === "locations" && (
            <Panel key="loc">
              <LocationPicker
                label="Pickup" icon="dot" value={pickup}
                onChange={setPickup}
                onPickOnMap={() => setPickingMap("pickup")}
                onUseCurrent={() => {
                  if (!navigator.geolocation) return toast.error("Geolocation not supported");
                  navigator.geolocation.getCurrentPosition(
                    (pos) => setPickup({ address: `Current location`, coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }),
                    () => toast.error("Couldn't get your location"),
                  );
                }}
              />
              <div className="h-2" />
              <LocationPicker
                label="Delivery" icon="square" value={dropoff}
                onChange={setDropoff}
                onPickOnMap={() => setPickingMap("dropoff")}
              />
              <PrimaryBtn disabled={!pickup.coords || !dropoff.coords} onClick={() => setStep("machine")}>
                Continue
              </PrimaryBtn>
            </Panel>
          )}

          {step === "machine" && (
            <Panel key="machine">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[44vh] overflow-y-auto pr-1">
                {MACHINERY.map((m) => {
                  const active = machine === m.id;
                  return (
                    <button key={m.id} onClick={() => setMachine(m.id)}
                      className={`glass rounded-xl p-3 text-left transition-all ${active ? "border-primary bg-primary/10" : "hover:border-primary/40"}`}>
                      <div className="text-2xl">{m.icon}</div>
                      <div className="text-xs font-semibold mt-2 leading-tight">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{m.weight}</div>
                    </button>
                  );
                })}
              </div>
              <PrimaryBtn disabled={!machine} onClick={() => setStep("trucks")}>
                Find live low loaders
              </PrimaryBtn>
            </Panel>
          )}

          {step === "trucks" && (
            <Panel key="trucks">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono text-muted-foreground">SORT · NEAREST FIRST</div>
                <div className="text-xs px-2 py-0.5 rounded-md bg-primary/15 text-primary font-semibold">Live</div>
              </div>
              {loadingTrucks ? (
                <div className="py-10 grid place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : trucksWithMeta.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <TruckIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No verified trucks online near you right now.
                  <div className="mt-1 text-xs">Try again in a moment — drivers come online throughout the day.</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                  {trucksWithMeta.map(({ truck, km, eta, price }) => (
                    <TruckCard key={truck.id} truck={truck} km={km} eta={eta} price={price}
                      active={selectedTruck === truck.id} onSelect={() => setSelectedTruck(truck.id)} />
                  ))}
                </div>
              )}
              <PrimaryBtn disabled={!selected} onClick={requestTruck}>
                {selected ? `Request for KSh ${selected.price.toLocaleString()}` : "Select a truck"}
              </PrimaryBtn>
            </Panel>
          )}

          {step === "tracking" && booking && (
            <Panel key="track">
              <StageHeader stage={stage} truck={selected?.truck} price={booking.estimated_price ?? 0} />
              <StageProgress stage={stage} />
              <div className="grid grid-cols-3 gap-2 mt-4">
                <ActionBtn icon={<Phone className="h-4 w-4" />} label="Call" />
                <ActionBtn icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
                <ActionBtn icon={<Shield className="h-4 w-4" />} label="SOS" danger />
              </div>
              {(stage === "completed" || stage === "cancelled") && (
                <button
                  onClick={() => { setBooking(null); setSelectedTruck(null); setMachine(null); setStep("locations"); }}
                  className="mt-4 w-full h-12 rounded-xl glass-strong font-medium hover:bg-white/5"
                >
                  Book another trip
                </button>
              )}
            </Panel>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ---------- helpers ---------- */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      className="glass-strong rounded-t-3xl p-4 sm:p-5 pb-6 mx-2 mb-2 sm:mx-4 sm:mb-4"
    >
      <div className="mx-auto h-1 w-10 rounded-full bg-white/15 mb-4" />
      {children}
    </motion.div>
  );
}

function PrimaryBtn({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed glow-safety">
      {children}
      {!disabled && <ChevronRight className="h-4 w-4" />}
    </button>
  );
}

function LocationPicker({
  label, icon, value, onChange, onPickOnMap, onUseCurrent,
}: {
  label: string;
  icon: "dot" | "square";
  value: { address: string; coords: { lat: number; lng: number } | null };
  onChange: (v: { address: string; coords: { lat: number; lng: number } | null }) => void;
  onPickOnMap: () => void;
  onUseCurrent?: () => void;
}) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!value.address || value.coords) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await geocode(value.address);
      setResults(r);
      setSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [value.address, value.coords]);

  return (
    <div>
      <div className="glass rounded-xl flex items-center gap-3 px-3 py-2">
        <div className="h-8 w-8 grid place-items-center">
          {icon === "dot" ? <MapPin className="h-4 w-4 text-primary" /> : <Navigation className="h-4 w-4" />}
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase">{label}</div>
          <input
            value={value.address}
            onChange={(e) => onChange({ address: e.target.value, coords: null })}
            placeholder="Search a place in Kenya / East Africa"
            className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground/60"
          />
        </div>
        {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="flex gap-1 mt-1">
        <button onClick={onPickOnMap} className="text-[11px] px-2 py-1 rounded glass hover:border-primary/40 inline-flex items-center gap-1">
          <Crosshair className="h-3 w-3" /> Pin on map
        </button>
        {onUseCurrent && (
          <button onClick={onUseCurrent} className="text-[11px] px-2 py-1 rounded glass hover:border-primary/40 inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Use current
          </button>
        )}
      </div>
      {results.length > 0 && !value.coords && (
        <div className="mt-1 glass rounded-xl divide-y divide-border max-h-44 overflow-auto">
          {results.map((r, i) => (
            <button key={i} onClick={() => onChange({ address: r.display_name, coords: { lat: r.lat, lng: r.lng } })}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-start gap-2">
              <Search className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TruckCard({
  truck, km, eta, price, active, onSelect,
}: { truck: Truck; km: number; eta: number; price: number; active: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect}
      className={`w-full text-left glass rounded-2xl p-4 transition-all ${active ? "border-primary bg-primary/10" : "hover:border-primary/40"}`}>
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center text-xl">🚛</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-sm truncate">{truck.truck_model}</div>
            <div className="text-xs px-1.5 py-0.5 rounded bg-white/10 font-mono">{truck.capacity_tons}T</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{truck.plate}</div>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-primary fill-primary" />Verified</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{eta} min</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground"><TruckIcon className="h-3 w-3" />{km.toFixed(1)} km</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold">KSh {price.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground font-mono">EST · INC VAT</div>
        </div>
      </div>
    </button>
  );
}

function StageHeader({ stage, truck, price }: { stage: BookingStage; truck?: Truck; price: number }) {
  const meta = STAGES.find((s) => s.id === stage)!;
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center">
        {stage === "completed" ? <Check className="h-5 w-5 text-primary" /> : <Loader2 className="h-5 w-5 text-primary animate-spin" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-primary tracking-widest uppercase">{meta.label}</div>
        <div className="font-semibold text-sm mt-0.5">{meta.desc}</div>
        {truck && (
          <div className="text-xs text-muted-foreground mt-1.5 truncate">{truck.truck_model} · {truck.capacity_tons}T</div>
        )}
      </div>
      <div className="text-right">
        <div className="font-display text-lg font-bold">KSh {price.toLocaleString()}</div>
        <div className="text-[10px] text-muted-foreground font-mono">M-PESA · ESCROW</div>
      </div>
    </div>
  );
}

const TRACK_STAGES: BookingStage[] = ["requested", "accepted", "en_route", "loading", "in_transit", "delivered", "completed"];
function StageProgress({ stage }: { stage: BookingStage }) {
  const idx = TRACK_STAGES.indexOf(stage);
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {TRACK_STAGES.map((s, i) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= idx ? "bg-primary" : "bg-white/10"}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
        <span>REQUEST</span><span>PICKUP</span><span>TRANSIT</span><span>DELIVERED</span>
      </div>
    </div>
  );
}

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "locations", label: "Location" },
  { id: "machine", label: "Machine" },
  { id: "trucks", label: "Trucks" },
  { id: "tracking", label: "Tracking" },
];

function StepBar({ step }: { step: Step }) {
  const idx = STEP_LABELS.findIndex((s) => s.id === step);
  return (
    <div className="glass rounded-2xl mt-2 p-3">
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`h-6 w-6 shrink-0 rounded-full grid place-items-center text-[10px] font-bold transition ${
                active ? "bg-primary text-primary-foreground glow-safety"
                : done ? "bg-primary/30 text-primary"
                : "bg-white/5 text-muted-foreground"
              }`}>
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              <div className={`text-[10px] font-mono uppercase tracking-wider truncate ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </div>
              {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-px ${i < idx ? "bg-primary/40" : "bg-white/10"}`} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, danger }: { icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button
      onClick={() => danger ? toast.error("SOS dispatched — support contacting you now.") : toast.success(`${label} — opening…`)}
      className={`h-12 rounded-xl glass flex flex-col items-center justify-center gap-0.5 hover:bg-white/5 transition ${danger ? "text-destructive" : ""}`}>
      {icon}
      <span className="text-[10px] font-mono">{label}</span>
    </button>
  );
}
