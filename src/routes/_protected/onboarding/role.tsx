import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Truck, User as UserIcon, Building2, Shield, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/_protected/onboarding/role")({
  validateSearch: (s: Record<string, unknown>): { preselect?: AppRole } => ({ preselect: (s.preselect as AppRole) || undefined }),
  component: RolePicker,
});

const ROLES: { id: AppRole; title: string; desc: string; icon: any; tag: string }[] = [
  { id: "client",  title: "Client",   desc: "I need to move heavy equipment.",          icon: UserIcon,  tag: "Book trucks" },
  { id: "driver",  title: "Driver / Operator", desc: "I drive a low loader truck.",     icon: Truck,     tag: "Earn jobs" },
  { id: "fleet",   title: "Fleet / Company",   desc: "I manage multiple trucks.",       icon: Building2, tag: "Manage fleet" },
];

function RolePicker() {
  const navigate = useNavigate();
  const { preselect } = useSearch({ from: "/_protected/onboarding/role" });
  const { user, role: existingRole, refresh } = useAuth();
  const [selected, setSelected] = useState<AppRole | null>(null);
  const [busy, setBusy] = useState(false);

  // If user already has a role, skip ahead.
  useEffect(() => {
    if (existingRole) {
      navigate({ to: "/onboarding/profile" });
    }
  }, [existingRole, navigate]);

  // Preselect from query (?preselect=client) or from localStorage (Google flow).
  useEffect(() => {
    if (selected) return;
    if (preselect) { setSelected(preselect); return; }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("ll_intent_role") as AppRole | null;
      if (stored && ["client", "driver", "fleet"].includes(stored)) setSelected(stored);
    }
  }, [preselect, selected]);

  async function confirm() {
    if (!selected || !user) return;
    setBusy(true);
    // Defensive: if a row somehow exists already, just continue.
    const { data: existing } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    if (!existing) {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: selected });
      if (error) {
        setBusy(false);
        toast.error(error.message);
        return;
      }
    }
    if (typeof window !== "undefined") localStorage.removeItem("ll_intent_role");
    await refresh();
    setBusy(false);
    navigate({ to: "/onboarding/profile" });
  }

  return (
    <AuthShell title="Choose your role" subtitle="Tell us how you'll use LoadLink so we can tailor your experience.">
      <div className="space-y-3">
        {ROLES.map((r, i) => {
          const active = selected === r.id;
          return (
            <motion.button
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelected(r.id)}
              className={`w-full text-left rounded-2xl p-4 border transition-all flex items-center gap-4 press ${
                active
                  ? "border-primary bg-primary-soft shadow-soft"
                  : "border-border bg-card hover:border-primary/40 shadow-soft"
              }`}
            >
              <div className={`h-12 w-12 rounded-2xl grid place-items-center shrink-0 ${active ? "bg-primary text-primary-foreground shadow-glow" : "bg-primary-soft text-primary"}`}>
                <r.icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold flex items-center gap-2 flex-wrap">
                  {r.title}
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{r.tag}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
              </div>
              <ChevronRight className={`h-4 w-4 transition ${active ? "text-primary" : "text-muted-foreground"}`} />
            </motion.button>
          );
        })}
        <button
          onClick={confirm}
          disabled={!selected || busy}
          className="w-full mt-2 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 shadow-glow press"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
        </button>
        <p className="text-[11px] text-muted-foreground text-center pt-1 inline-flex items-center justify-center gap-1.5 w-full">
          <Shield className="h-3 w-3" /> Admin accounts are provisioned manually for security.
        </p>
      </div>
    </AuthShell>
  );
}
