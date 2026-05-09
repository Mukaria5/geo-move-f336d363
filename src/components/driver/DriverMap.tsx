import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";

export function DriverMap({ pickup, dropoff }: { pickup?: string; dropoff?: string }) {
  return (
    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-border">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.22_0.04_240)_0%,oklch(0.10_0.02_240)_70%)]" />
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dgrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dgrid)" className="text-primary/40" />
      </svg>
      {/* roads */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="none">
        <path d="M 5 50 Q 30 30 50 28 T 95 12" stroke="oklch(0.85 0.18 90 / 0.5)" strokeWidth="0.8" fill="none" strokeDasharray="2 1.5" />
        <path d="M 10 10 L 90 55" stroke="oklch(0.6 0.1 240 / 0.3)" strokeWidth="0.4" fill="none" />
      </svg>
      {/* pickup pin */}
      <div className="absolute" style={{ left: "12%", top: "78%" }}>
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <div className="h-3 w-3 rounded-full bg-primary ring-4 ring-primary/30" />
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border">
            PICKUP
          </div>
        </div>
      </div>
      {/* dropoff pin */}
      <div className="absolute" style={{ left: "88%", top: "20%" }}>
        <div className="relative -translate-x-1/2 -translate-y-1/2">
          <MapPin className="h-5 w-5 text-foreground" />
          <div className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border">
            DROP
          </div>
        </div>
      </div>
      {/* moving truck */}
      <motion.div
        initial={{ left: "12%", top: "78%" }}
        animate={{ left: ["12%", "50%", "88%"], top: ["78%", "45%", "20%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -translate-x-1/2 -translate-y-1/2"
      >
        <div className="relative h-7 w-7 rounded-full bg-primary grid place-items-center shadow-[0_0_20px_var(--safety-glow)]">
          <Navigation className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
        </div>
      </motion.div>
      {(pickup || dropoff) && (
        <div className="absolute bottom-2 left-2 right-2 glass-strong rounded-xl px-3 py-2 text-[11px] flex items-center justify-between gap-2">
          <span className="truncate"><span className="text-primary">●</span> {pickup}</span>
          <span className="truncate text-right"><span className="opacity-60">●</span> {dropoff}</span>
        </div>
      )}
    </div>
  );
}
