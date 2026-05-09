import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, Input, PrimaryButton } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/forgot")({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth/reset-password",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a secure reset link."
      footer={<Link to="/auth/login" className="text-primary font-medium">Back to sign in</Link>}
    >
      {sent ? (
        <div className="text-center py-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-primary/15 grid place-items-center mb-4">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm">Check <span className="font-semibold">{email}</span> for the reset link.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.co.ke" />
          </Field>
          <PrimaryButton type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
}
