import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

/** Lightweight pull-to-refresh wrapper for mobile screens. */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: ReactNode }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 4 || busy) return;
    startY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.45, 80));
  };
  const onTouchEnd = async () => {
    if (pull > 55) {
      setBusy(true);
      try { await onRefresh(); } finally { setBusy(false); }
    }
    setPull(0);
    startY.current = null;
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <motion.div
        animate={{ height: busy ? 44 : pull }}
        transition={{ type: "spring", stiffness: 400, damping: 34 }}
        className="grid place-items-center overflow-hidden"
      >
        <RefreshCw className={`h-4 w-4 text-primary ${busy ? "animate-spin" : ""}`} style={{ opacity: busy ? 1 : pull / 60 }} />
      </motion.div>
      {children}
    </div>
  );
}
