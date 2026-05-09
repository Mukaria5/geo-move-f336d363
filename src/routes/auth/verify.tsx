import { createFileRoute, useSearch } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/auth/verify")({
  validateSearch: (s) => ({ email: (s.email as string) || "" }),
  component: Verify,
});

function Verify() {
  const { email } = useSearch({ from: "/auth/verify" });
  return (
    <AuthShell title="Check your inbox" subtitle="We sent you a verification link.">
      <div className="text-center py-3">
        <div className="h-12 w-12 mx-auto rounded-full bg-primary/15 grid place-items-center mb-4">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm">Click the link sent to <span className="font-semibold">{email || "your email"}</span> to verify your account.</p>
        <p className="text-xs text-muted-foreground mt-3">Check spam if you don't see it within a minute.</p>
      </div>
    </AuthShell>
  );
}
