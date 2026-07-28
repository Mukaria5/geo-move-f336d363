import { motion } from "framer-motion";
import { Truck, Sparkles } from "lucide-react";

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--primary) 18%, var(--background)) 0%, var(--background) 60%)",
      }}
    >
      {/* Ambient blobs */}
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gold/25 blur-3xl" />

      <div className="relative flex flex-col items-center text-center px-6">
        <motion.div
          initial={{ scale: 0.55, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-24 w-24 rounded-3xl grid place-items-center card-premium shadow-glow"
        >
          <Truck className="h-11 w-11 text-primary-foreground" strokeWidth={2.4} />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="absolute -right-2 -top-2 h-8 w-8 rounded-full card-gold grid place-items-center"
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.4} />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-7 font-display text-4xl font-bold tracking-tight"
        >
          Load<span className="text-gradient-safety">Link</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-2 text-sm text-muted-foreground"
        >
          Move heavy equipment smarter
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-primary/70"
        >
          <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
          Low loader network
          <span className="h-1 w-1 rounded-full bg-gold animate-pulse" />
        </motion.div>
      </div>
    </motion.div>
  );
}
