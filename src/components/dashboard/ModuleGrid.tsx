import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { primaryModulesFor } from "@/lib/nav-modules";

/** Compact module launcher shown on role dashboards — every completed module is one tap away. */
export function ModuleGrid({ title = "Modules" }: { title?: string }) {
  const { role } = useAuth();
  const items = primaryModulesFor((role ?? "fleet") as AppRole);
  if (items.length === 0) return null;

  return (
    <div className="card-elevated p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-sm font-display font-semibold">{title}</div>
        <Link to="/dashboard/more" className="ml-auto text-[11px] font-semibold text-primary press">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((m, i) => (
          <motion.div key={m.to} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
            <Link
              to={m.to}
              className="card-elevated h-full p-3 flex flex-col items-center gap-1.5 text-center press"
            >
              <div className="h-10 w-10 rounded-2xl bg-primary-soft text-primary grid place-items-center">
                <m.icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </div>
              <div className="text-[11px] font-semibold leading-tight">{m.label}</div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
