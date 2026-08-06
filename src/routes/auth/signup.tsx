import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User as UserIcon, Phone, Truck, Building2, Shield, ChevronRight } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AuthShell, Field, Input, PrimaryButton, GhostButton } from "@/components/auth/AuthShell";
import type { AppRole } from "@/lib/auth-context";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().min(7, "Enter your phone number").max(20),
  password: z.string().min(8, "At least 8 characters").max(72),
});

const ROLES: { id: AppRole; title: string; desc: string; icon: any; tag: string }[] = [
  { id: "client", title: "Client", desc: "I need to move heavy equipment.", icon: UserIcon, tag: "Book trucks" },
  { id: "driver", title: "Driver / Operator", desc: "I drive a low loader truck.", icon: Truck, tag: "Earn jobs" },
  { id: "fleet", title: "Fleet / Company", desc: "I manage multiple trucks.", icon: Building2, tag: "Manage fleet" },
];

export const Route = createFileRoute("/auth/signup")({
  validateSearch: (s: Record<string, unknown>) => ({ role: (s.role as AppRole) || undefined }),
  component: Signup,
});

function Signup() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/signup" });
  const [role, setRole] = useState<AppRole | null>(search.role ?? null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  // Role is stored in user_metadata at signup. The user_roles row is created
  // exactly once at /onboarding/role (RLS only allows one self-insert), to
  // avoid a duplicate-row collision after sign-in.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) { toast.error("Pick your role first"); return; }
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin + "/auth/callback",
        data: { full_name: form.fullName, phone: form.phone, role },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) {
      toast.success("Account created");
      navigate({ to: "/onboarding/role", search: { preselect: role } });
    } else {
      navigate({ to: "/auth/verify", search: { email: form.email } });
    }
  }

  async function google() {
    if (!role) { toast.error("Pick your role first"); return; }
    setBusy(true);
    // Persist intent so onboarding can preselect after redirect.
    if (typeof window !== "undefined") localStorage.setItem("ll_intent_role", role);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth/callback" });
    if (result.error) { toast.error("Google sign-up failed"); setBusy(false); return; }
    if (result.redirected) return;
    setBusy(false);
    navigate({ to: "/onboarding/role" });
  }

  if (!role) {
    return (
      <AuthShell title="Join LoadLink" subtitle="First, tell us how you'll use LoadLink.">
        <div className="space-y-3">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className="w-full text-left rounded-xl p-4 border border-border bg-secondary/60 hover:border-primary/40 transition-all flex items-center gap-4"
            >
              <div className="h-11 w-11 rounded-xl bg-secondary/60 grid place-items-center">
                <r.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {r.title}
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{r.tag}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.desc}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          <p className="text-[11px] text-muted-foreground text-center pt-1 inline-flex items-center justify-center gap-1.5 w-full">
            <Shield className="h-3 w-3" /> Admin accounts are invite-only.
          </p>
          <p className="text-xs text-center text-muted-foreground">
            Already a member? <Link to="/auth/login" className="text-primary font-medium">Sign in</Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  const roleMeta = ROLES.find((r) => r.id === role)!;

  return (
    <AuthShell
      title="Create your account"
      subtitle="The on-demand low-loader network for East Africa."
      footer={<>Already a member? <Link to="/auth/login" className="text-primary font-medium">Sign in</Link></>}
    >
      <button
        type="button"
        onClick={() => setRole(null)}
        className="w-full mb-4 glass rounded-xl p-3 flex items-center gap-3 hover:border-primary/40 transition"
      >
        <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center text-primary">
          <roleMeta.icon className="h-4 w-4" />
        </div>
        <div className="flex-1 text-left">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Signing up as</div>
          <div className="text-sm font-semibold">{roleMeta.title}</div>
        </div>
        <span className="text-xs text-primary">Change</span>
      </button>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name">
          <div className="relative">
            <UserIcon className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
            <Input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Jane Wanjiku" className="pl-9" />
          </div>
        </Field>
        <Field label="Email">
          <div className="relative">
            <Mail className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
            <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.co.ke" className="pl-9" />
          </div>
        </Field>
        <Field label="Phone">
          <div className="relative">
            <Phone className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
            <Input required value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+254 712 345 678" className="pl-9" />
          </div>
        </Field>
        <Field label="Password" hint="Min 8 characters. Use a strong, unique password.">
          <div className="relative">
            <Lock className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
            <Input type="password" required value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" className="pl-9" />
          </div>
        </Field>
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </PrimaryButton>
        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
        </div>
        <GhostButton type="button" onClick={google} disabled={busy}>
          <GoogleIcon /> Continue with Google
        </GhostButton>
        <p className="text-[11px] text-muted-foreground text-center">
          By continuing you agree to LoadLink's Terms & Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}

function GoogleIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.3l-6.2-5.2c-2 1.5-4.5 2.5-7.2 2.5-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.2 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.2C41.6 35.4 43.5 30.1 43.5 24c0-1.2-.1-2.4-.4-3.5z"/></svg>;
}
