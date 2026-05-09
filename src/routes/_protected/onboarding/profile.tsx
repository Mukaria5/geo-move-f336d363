import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, dashboardPath } from "@/lib/auth-context";
import { AuthShell, Field, Input } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/_protected/onboarding/profile")({ component: ProfileSetup });

const driverSchema = z.object({
  vehicle_make: z.string().trim().min(1).max(80),
  vehicle_model: z.string().trim().min(1).max(80),
  plate: z.string().trim().min(3).max(20),
  capacity_tons: z.coerce.number().min(1).max(200),
  license_no: z.string().trim().min(3).max(50),
  national_id_no: z.string().trim().min(3).max(50),
});

const fleetSchema = z.object({
  company_name: z.string().trim().min(2).max(120),
  registration_no: z.string().trim().min(2).max(80),
  kra_pin: z.string().trim().min(3).max(50),
  contact_email: z.string().email().max(255),
  fleet_size: z.coerce.number().min(1).max(10000),
});

function ProfileSetup() {
  const { user, role, refresh } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!role) navigate({ to: "/onboarding/role" });
  }, [role, navigate]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !role) return;
    setBusy(true);

    if (role === "driver") {
      const parsed = driverSchema.safeParse(form);
      if (!parsed.success) { toast.error(parsed.error.issues[0].message); setBusy(false); return; }
      const { error } = await supabase.from("driver_profiles").upsert({ user_id: user.id, ...parsed.data });
      if (error) { toast.error(error.message); setBusy(false); return; }
      await supabase.from("profiles").update({ onboarded: false }).eq("id", user.id); // still need docs
      navigate({ to: "/onboarding/documents" });
    } else if (role === "fleet") {
      const parsed = fleetSchema.safeParse(form);
      if (!parsed.success) { toast.error(parsed.error.issues[0].message); setBusy(false); return; }
      const { error } = await supabase.from("fleet_companies").upsert({ user_id: user.id, ...parsed.data });
      if (error) { toast.error(error.message); setBusy(false); return; }
      await supabase.from("profiles").update({ onboarded: false }).eq("id", user.id);
      navigate({ to: "/onboarding/documents" });
    } else {
      // client — no extra docs required
      await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
      await refresh();
      toast.success("All set!");
      navigate({ to: dashboardPath(role) });
    }
    setBusy(false);
  }

  return (
    <AuthShell
      title={role === "driver" ? "Driver setup" : role === "fleet" ? "Company setup" : "Final touches"}
      subtitle={role === "client" ? "You're almost ready to book your first low loader." : "We need a few details to verify your account."}
    >
      <form onSubmit={submit} className="space-y-4">
        {role === "driver" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Make"><Input value={form.vehicle_make ?? ""} onChange={(e) => set("vehicle_make", e.target.value)} placeholder="Scania" /></Field>
              <Field label="Model"><Input value={form.vehicle_model ?? ""} onChange={(e) => set("vehicle_model", e.target.value)} placeholder="R580" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plate"><Input value={form.plate ?? ""} onChange={(e) => set("plate", e.target.value)} placeholder="KDH 421X" /></Field>
              <Field label="Capacity (T)"><Input type="number" value={form.capacity_tons ?? ""} onChange={(e) => set("capacity_tons", e.target.value)} placeholder="40" /></Field>
            </div>
            <Field label="National ID number"><Input value={form.national_id_no ?? ""} onChange={(e) => set("national_id_no", e.target.value)} placeholder="3xxxxxxx" /></Field>
            <Field label="Driving license number"><Input value={form.license_no ?? ""} onChange={(e) => set("license_no", e.target.value)} placeholder="DL/xxxxx" /></Field>
          </>
        )}
        {role === "fleet" && (
          <>
            <Field label="Company name"><Input value={form.company_name ?? ""} onChange={(e) => set("company_name", e.target.value)} placeholder="Epco Logistics Ltd" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reg. number"><Input value={form.registration_no ?? ""} onChange={(e) => set("registration_no", e.target.value)} placeholder="C.xxxxx" /></Field>
              <Field label="KRA PIN"><Input value={form.kra_pin ?? ""} onChange={(e) => set("kra_pin", e.target.value)} placeholder="P0xxxxxxx" /></Field>
            </div>
            <Field label="Contact email"><Input type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} placeholder="ops@yourco.co.ke" /></Field>
            <Field label="Fleet size"><Input type="number" value={form.fleet_size ?? ""} onChange={(e) => set("fleet_size", e.target.value)} placeholder="12" /></Field>
          </>
        )}
        {role === "client" && (
          <p className="text-sm text-muted-foreground">No additional details needed — tap continue to start booking.</p>
        )}
        <button type="submit" disabled={busy} className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 glow-safety">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : role === "client" ? "Finish" : "Continue to documents"}
        </button>
      </form>
    </AuthShell>
  );
}
