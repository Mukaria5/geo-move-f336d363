import { motion } from "framer-motion";
import { Truck } from "lucide-react";

export function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-[100] grid place-items-center bg-background"
    >
      <div className="flex flex-col items-center text-center px-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-24 w-24 rounded-3xl bg-primary grid place-items-center glow-safety"
        >
          <Truck className="h-12 w-12 text-primary-foreground" strokeWidth={2.5} />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="mt-6 font-display text-4xl font-bold tracking-tight"
        >
          Load<span className="text-gradient-safety">Link</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-2 text-sm text-muted-foreground"
        >
          Move Heavy Equipment Smarter
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-[10px] font-mono tracking-widest text-primary"
        >
          // LOW LOADER NETWORK
        </motion.div>
      </div>
    </motion.div>
  );
}
