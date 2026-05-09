import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import type { Truck } from "@/lib/booking-data";

type Props = {
  trucks?: Truck[];
  selectedTruck?: string | null;
  showRoute?: boolean;
  driverPos?: { x: number; y: number };
};

export function MockMap({ trucks = [], selectedTruck, showRoute, driverPos }: Props) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-navy-deep">
      {/* base */}
      <div className="absolute inset-0" style={{
        background:
          "radial-gradient(80% 60% at 50% 40%, oklch(0.22 0.06 258), oklch(0.13 0.03 260))",
      }} />
      {/* grid */}
      <div className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 0.6) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.6) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }} />
      {/* roads */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path d="M -5 60 Q 30 50 50 55 T 105 50" stroke="oklch(0.4 0.05 258)" strokeWidth="2.5" fill="none" />
        <path d="M 50 -5 Q 45 30 55 55 T 60 105" stroke="oklch(0.4 0.05 258)" strokeWidth="2.5" fill="none" />
        <path d="M -5 25 Q 30 35 60 30 T 105 35" stroke="oklch(0.35 0.05 258)" strokeWidth="1.5" fill="none" />
        <path d="M 20 -5 Q 25 40 30 60 T 35 105" stroke="oklch(0.35 0.05 258)" strokeWidth="1.5" fill="none" />

        {showRoute && (
          <path
            d="M 22 78 Q 40 60 55 50 T 82 22"
            stroke="var(--safety)"
            strokeWidth="1.2"
            strokeDasharray="2 2"
            fill="none"
            className="animate-pulse"
          />
        )}
      </svg>

      {/* pickup pin */}
      <div className="absolute" style={{ left: "22%", top: "78%" }}>
        <div className="relative -translate-x-1/2 -translate-y-full">
          <div className="h-8 w-8 rounded-full bg-primary grid place-items-center shadow-[0_0_30px_var(--safety-glow)]">
            <MapPin className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="absolute inset-0 rounded-full pulse-ring opacity-50" />
        </div>
      </div>

      {/* delivery pin */}
      <div className="absolute" style={{ left: "82%", top: "22%" }}>
        <div className="relative -translate-x-1/2 -translate-y-full">
          <div className="h-7 w-7 rounded-md bg-foreground grid place-items-center">
            <Navigation className="h-3.5 w-3.5 text-background" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* trucks */}
      {trucks.map((t) => {
        const active = selectedTruck === t.id;
        return (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + Math.random() * 0.4 }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
          >
            <div className={`relative h-9 w-9 rounded-xl grid place-items-center transition-all ${
              active ? "bg-primary scale-110 shadow-[0_0_24px_var(--safety-glow)]" : "bg-foreground/95"
            }`}>
              <span className="text-base">🚛</span>
              {active && <div className="absolute inset-0 rounded-xl pulse-ring opacity-40" />}
            </div>
          </motion.div>
        );
      })}

      {/* live driver */}
      {driverPos && (
        <motion.div
          initial={false}
          animate={{ left: `${driverPos.x}%`, top: `${driverPos.y}%` }}
          transition={{ duration: 2, ease: "linear" }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative h-10 w-10 rounded-xl bg-primary grid place-items-center shadow-[0_0_30px_var(--safety-glow)]">
            <span className="text-base">🚛</span>
            <div className="absolute inset-0 rounded-xl pulse-ring" />
          </div>
        </motion.div>
      )}

      {/* fade vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "linear-gradient(180deg, oklch(0.13 0.02 260 / 0.4) 0%, transparent 30%, transparent 60%, oklch(0.13 0.02 260 / 0.6) 100%)",
      }} />
    </div>
  );
}
