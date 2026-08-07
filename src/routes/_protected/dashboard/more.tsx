import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight, LogOut } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { modulesFor } from "@/lib/nav-modules";

export const Route = createFileRoute("/_protected/dashboard/more")({
  component: MoreHub,
});

function MoreHub() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const groups = modulesFor((role ?? "client") as AppRole);
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email || "Account";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <DashboardShell title="All modules" role="Navigation">
      <div className="card-premium p-5 mb-4 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gold/20 blur-2xl pointer-events-none" />
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary-foreground/70">
          {role ?? "member"}
        </div>
        <div className="font-display text-xl font-bold mt-2 text-primary-foreground truncate">{name}</div>
        <div className="text-primary-foreground/70 text-sm mt-1">Everything LoadLink can do, in one place.</div>
      </div>

      {groups.map((g, gi) => (
        <div key={g.group} className="card-elevated p-4 mb-3">
          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{g.group}</div>
          <div className="mt-2 space-y-1.5">
            {g.items.map((m, i) => (
              <motion.div
                key={m.to}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * (gi * 4 + i) }}
              >
                <Link to={m.to} className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-3 press">
                  <div className="h-10 w-10 rounded-2xl bg-primary-soft text-primary grid place-items-center shrink-0">
                    <m.icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate">{m.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{m.desc}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={signOut}
        className="w-full h-12 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center justify-center gap-2 press mb-4"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </DashboardShell>
  );
}
