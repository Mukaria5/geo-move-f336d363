import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Truck, User as UserIcon, Building2, Shield, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole, dashboardPath } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/_protected/onboarding/role")({ component: RolePicker });

const ROLES: { id: AppRole; title: string; desc: string; icon: any; tag: string }[] = [
  { id: "client",  title: "Client",   desc: "I need to move heavy equipment.",          icon: UserIcon,  tag: "Book trucks" },
  { id: "driver",  title: "Driver / Operator", desc: "I drive a low loader truck.",     icon: Truck,     tag: "Earn jobs" },
  { id: "fleet",   title: "Fleet / Company",   desc: "I manage multiple trucks.",       icon: Building2, tag: "Manage fleet" },
];

function RolePicker() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [selected, setSelected] = useState<AppRole | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!selected || !user) return;
    setBusy(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: selected });
    if (error && !error.message.includes("duplicate")) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
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
              className={`w-full text-left rounded-xl p-4 border transition-all flex items-center gap-4 ${
                active ? "border-primary bg-primary/10" : "border-border bg-white/5 hover:border-primary/40"
              }`}
            >
              <div className={`h-11 w-11 rounded-xl grid place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-white/5"}`}>
                <r.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {r.title}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">{r.tag}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          );
        })}
        <button
          onClick={confirm}
          disabled={!selected || busy}
          className="w-full mt-2 h-11 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 glow-safety"
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
