import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export function BottomSheet({
  open, onClose, title, children, maxHeight = "85vh",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-[28px] shadow-float border-t border-border overflow-hidden"
            style={{ maxHeight }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
          >
            <div className="pt-2 pb-1 grid place-items-center">
              <div className="h-1.5 w-10 rounded-full bg-border" />
            </div>
            {title && (
              <div className="px-5 pb-3 flex items-center justify-between">
                <h3 className="text-lg font-display font-semibold">{title}</h3>
                <button onClick={onClose} className="tap grid place-items-center rounded-full hover:bg-secondary" aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: `calc(${maxHeight} - 4rem)` }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
