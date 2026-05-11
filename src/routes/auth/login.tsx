import { useState } from "react";
import { useNavigate, useSearch, createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Phone, KeyRound } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { AuthShell, Field, Input, PrimaryButton, GhostButton } from "@/components/auth/AuthShell";
import { useAuth, dashboardPath } from "@/lib/auth-context";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

export const Route = createFileRoute("/auth/login")({
  validateSearch: (s) => ({ redirect: (s.redirect as string) || undefined }),
  component: Login,
});

type Mode = "email" | "phone";

function Login() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/login" });
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function go(uid: string) {
    const { data: roleRow } = await supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
    const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", uid).maybeSingle();
    await refresh();
    if (search.redirect) { navigate({ to: search.redirect }); return; }
    if (!roleRow?.role) { navigate({ to: "/onboarding/role" }); return; }
    if (!profile?.onboarded) { navigate({ to: "/onboarding/profile" }); return; }
    navigate({ to: dashboardPath(roleRow.role as any) });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data.user) await go(data.user.id);
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.trim().length < 7) { toast.error("Enter a valid phone number"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setOtpSent(true);
    toast.success("Code sent via SMS");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 4) { toast.error("Enter the SMS code"); return; }
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({ phone: phone.trim(), token: otp.trim(), type: "sms" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data.user) await go(data.user.id);
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth/callback" });
    if (result.error) { toast.error("Google sign-in failed"); setBusy(false); return; }
    if (result.redirected) return;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await go(data.session.user.id);
    setBusy(false);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your transport jobs."
      footer={<>Don't have an account? <Link to="/auth/signup" className="text-primary font-medium">Create one</Link></>}
    >
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-white/5 mb-5 text-xs font-mono uppercase tracking-wider">
        {(["email", "phone"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setOtpSent(false); }}
            className={`h-8 rounded-md transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {m === "email" ? "Email" : "Phone OTP"}
          </button>
        ))}
      </div>

      {mode === "email" && (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.co.ke" className="pl-9" />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <Lock className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" />
            </div>
          </Field>
          <div className="flex justify-end -mt-2">
            <Link to="/auth/forgot" className="text-xs text-muted-foreground hover:text-foreground">Forgot password?</Link>
          </div>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </PrimaryButton>
        </form>
      )}

      {mode === "phone" && !otpSent && (
        <form onSubmit={sendOtp} className="space-y-4">
          <Field label="Phone number" hint="We'll text you a one-time code.">
            <div className="relative">
              <Phone className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
              <Input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 712 345 678" className="pl-9" />
            </div>
          </Field>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send SMS code"}
          </PrimaryButton>
        </form>
      )}

      {mode === "phone" && otpSent && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <Field label="6-digit code" hint={`Sent to ${phone}`}>
            <div className="relative">
              <KeyRound className="h-4 w-4 absolute left-3 top-3.5 text-muted-foreground" />
              <Input inputMode="numeric" required value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" className="pl-9 tracking-widest" />
            </div>
          </Field>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
          </PrimaryButton>
          <button type="button" onClick={() => setOtpSent(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">
            Use a different number
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground my-4">
        <div className="flex-1 h-px bg-border" /> OR <div className="flex-1 h-px bg-border" />
      </div>
      <GhostButton type="button" onClick={google} disabled={busy}>
        <GoogleIcon /> Continue with Google
      </GhostButton>
    </AuthShell>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.3l-6.2-5.2c-2 1.5-4.5 2.5-7.2 2.5-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.2 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.2 5.2C41.6 35.4 43.5 30.1 43.5 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
  );
}
