import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Navigation, ChevronRight, Star, Clock, Truck as TruckIcon,
  Phone, MessageSquare, Shield, Check, Loader2,
} from "lucide-react";
import { MockMap } from "@/components/MockMap";
import { MACHINERY, TRUCKS, STAGES, type BookingStage, type Truck } from "@/lib/booking-data";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a low loader · LoadLink" },
      { name: "description", content: "Request a verified low-loader truck for your machinery — instant pricing, live tracking." },
    ],
  }),
  component: BookPage,
});

type Step = "locations" | "machine" | "trucks" | "tracking";

function BookPage() {
  const [step, setStep] = useState<Step>("locations");
  const [pickup, setPickup] = useState("Mlolongo Yard, Nairobi");
  const [dropoff, setDropoff] = useState("");
  const [machine, setMachine] = useState<string | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<string | null>(null);
  const [stage, setStage] = useState<BookingStage>("requested");

  // simulate stage progression once tracking starts
  useEffect(() => {
    if (step !== "tracking") return;
    const order: BookingStage[] = ["requested", "accepted", "en_route", "loading", "in_transit", "delivered", "completed"];
    const idx = order.indexOf(stage);
    if (idx >= order.length - 1) return;
    const t = setTimeout(() => setStage(order[idx + 1]), idx === 0 ? 2200 : 4000);
    return () => clearTimeout(t);
  }, [step, stage]);

  const truck = useMemo(() => TRUCKS.find((t) => t.id === selectedTruck), [selectedTruck]);

  // simulated driver position based on stage
  const driverPos = useMemo(() => {
    switch (stage) {
      case "requested":
      case "accepted":
        return truck ? { x: truck.x, y: truck.y } : undefined;
      case "en_route":
        return { x: 32, y: 60 };
      case "loading":
        return { x: 22, y: 78 };
      case "in_transit":
        return { x: 55, y: 50 };
      case "delivered":
      case "completed":
        return { x: 82, y: 22 };
    }
  }, [stage, truck]);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* MAP layer */}
      <div className="fixed inset-0">
        <MockMap
          trucks={step === "trucks" ? TRUCKS : step === "tracking" && truck ? [] : []}
          selectedTruck={selectedTruck}
          showRoute={step === "tracking" && (stage === "in_transit" || stage === "delivered" || stage === "completed")}
          driverPos={step === "tracking" ? driverPos : undefined}
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
              {step === "trucks" && `${TRUCKS.length} low loaders nearby`}
              {step === "tracking" && truck && `${truck.driver} · ${truck.plate}`}
            </div>
          </div>
        </div>
        <StepBar step={step} />
      </div>

      {/* BOTTOM PANEL */}
      <div className="fixed bottom-0 inset-x-0 z-20">
        <AnimatePresence mode="wait">
          {step === "locations" && (
            <Panel key="loc">
              <div className="space-y-3">
                <LocationField icon="dot" label="Pickup" value={pickup} onChange={setPickup} placeholder="Pickup location" />
                <LocationField icon="square" label="Delivery" value={dropoff} onChange={setDropoff} placeholder="Where to?" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                {["Industrial Area", "Mombasa Rd", "Naivasha"].map((s) => (
                  <button key={s} onClick={() => setDropoff(s)} className="glass rounded-lg py-2 hover:border-primary/40 transition">
                    {s}
                  </button>
                ))}
              </div>
              <PrimaryBtn disabled={!pickup || !dropoff} onClick={() => setStep("machine")}>
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
                    <button
                      key={m.id}
                      onClick={() => setMachine(m.id)}
                      className={`glass rounded-xl p-3 text-left transition-all ${
                        active ? "border-primary bg-primary/10" : "hover:border-primary/40"
                      }`}
                    >
                      <div className="text-2xl">{m.icon}</div>
                      <div className="text-xs font-semibold mt-2 leading-tight">{m.name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{m.weight}</div>
                    </button>
                  );
                })}
              </div>
              <PrimaryBtn disabled={!machine} onClick={() => setStep("trucks")}>
                Find low loaders
              </PrimaryBtn>
            </Panel>
          )}

          {step === "trucks" && (
            <Panel key="trucks">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono text-muted-foreground">SORT · BEST MATCH</div>
                <div className="text-xs px-2 py-0.5 rounded-md bg-primary/15 text-primary font-semibold">Live</div>
              </div>
              <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                {TRUCKS.map((t) => (
                  <TruckCard key={t.id} truck={t} active={selectedTruck === t.id} onSelect={() => setSelectedTruck(t.id)} />
                ))}
              </div>
              <PrimaryBtn disabled={!selectedTruck} onClick={() => { setStage("requested"); setStep("tracking"); }}>
                {truck ? `Request for KSh ${calcPrice(truck).toLocaleString()}` : "Select a truck"}
              </PrimaryBtn>
            </Panel>
          )}

          {step === "tracking" && truck && (
            <Panel key="track">
              <StageHeader stage={stage} truck={truck} />
              <StageProgress stage={stage} />
              <div className="grid grid-cols-3 gap-2 mt-4">
                <ActionBtn icon={<Phone className="h-4 w-4" />} label="Call" />
                <ActionBtn icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
                <ActionBtn icon={<Shield className="h-4 w-4" />} label="SOS" danger />
              </div>
              {stage === "completed" && (
                <button onClick={resetAll(setStep, setSelectedTruck, setStage, setMachine, setDropoff)}
                  className="mt-4 w-full h-12 rounded-xl glass-strong font-medium hover:bg-white/5">
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

function calcPrice(t: Truck) {
  return t.basePrice + Math.round(t.distanceKm * t.pricePerKm);
}

function resetAll(
  setStep: (s: Step) => void,
  setTruck: (s: string | null) => void,
  setStage: (s: BookingStage) => void,
  setMachine: (s: string | null) => void,
  setDropoff: (s: string) => void,
) {
  return () => {
    setStep("locations");
    setTruck(null);
    setStage("requested");
    setMachine(null);
    setDropoff("");
  };
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
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
    <button
      disabled={disabled}
      onClick={onClick}
      className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed glow-safety"
    >
      {children}
      {!disabled && <ChevronRight className="h-4 w-4" />}
    </button>
  );
}

function LocationField({
  icon, label, value, onChange, placeholder,
}: { icon: "dot" | "square"; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="glass rounded-xl flex items-center gap-3 px-3 py-2">
      <div className="h-8 w-8 grid place-items-center">
        {icon === "dot" ? (
          <MapPin className="h-4 w-4 text-primary" />
        ) : (
          <Navigation className="h-4 w-4 text-foreground" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-mono text-muted-foreground uppercase">{label}</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}

function TruckCard({ truck, active, onSelect }: { truck: Truck; active: boolean; onSelect: () => void }) {
  const price = calcPrice(truck);
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left glass rounded-2xl p-4 transition-all ${
        active ? "border-primary bg-primary/10" : "hover:border-primary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center text-xl">🚛</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-sm truncate">{truck.truckModel}</div>
            <div className="text-xs px-1.5 py-0.5 rounded bg-white/10 font-mono">{truck.capacity}</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{truck.driver} · {truck.plate}</div>
          <div className="flex items-center gap-3 mt-1.5 text-xs">
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 text-primary fill-primary" />{truck.rating}</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" />{truck.etaMin} min</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground"><TruckIcon className="h-3 w-3" />{truck.distanceKm} km</span>
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

function StageHeader({ stage, truck }: { stage: BookingStage; truck: Truck }) {
  const meta = STAGES.find((s) => s.id === stage)!;
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center">
        {stage === "completed" ? (
          <Check className="h-5 w-5 text-primary" />
        ) : (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-mono text-primary tracking-widest uppercase">{meta.label}</div>
        <div className="font-semibold text-sm mt-0.5">{meta.desc}</div>
        <div className="text-xs text-muted-foreground mt-1.5 truncate">
          {truck.truckModel} · {truck.capacity} · ETA {truck.etaMin} min
        </div>
      </div>
      <div className="text-right">
        <div className="font-display text-lg font-bold">KSh {calcPrice(truck).toLocaleString()}</div>
        <div className="text-[10px] text-muted-foreground font-mono">M-PESA · ESCROW</div>
      </div>
    </div>
  );
}

function StageProgress({ stage }: { stage: BookingStage }) {
  const idx = STAGES.findIndex((s) => s.id === stage);
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {STAGES.map((s, i) => (
          <div
            key={s.id}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              i <= idx ? "bg-primary" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
        <span>REQUEST</span>
        <span>PICKUP</span>
        <span>TRANSIT</span>
        <span>DELIVERED</span>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, danger }: { icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button className={`h-12 rounded-xl glass flex flex-col items-center justify-center gap-0.5 hover:bg-white/5 transition ${
      danger ? "text-destructive" : ""
    }`}>
      {icon}
      <span className="text-[10px] font-mono">{label}</span>
    </button>
  );
}
