import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Truck, ArrowRight, Loader2 } from "lucide-react";
import { useAuth, dashboardPath } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LoadLink — Move Heavy Equipment Smarter" },
      { name: "description", content: "On-demand low loader transport. Book, dispatch, and track heavy equipment in real time." },
      { property: "og:title", content: "LoadLink — Move Heavy Equipment Smarter" },
      { property: "og:description", content: "On-demand low loader transport for heavy equipment." },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { user, role, onboarded, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    if (!role) { navigate({ to: "/onboarding/role" }); return; }
    if (!onboarded) { navigate({ to: "/onboarding/profile" }); return; }
    navigate({ to: dashboardPath(role) });
  }, [user, role, onboarded, loading, navigate]);

  if (loading || user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-2xl bg-primary grid place-items-center glow-safety mb-6">
          <Truck className="h-10 w-10 text-primary-foreground" strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
          Load<span className="text-gradient-safety">Link</span>
        </h1>
        <p className="mt-3 text-lg sm:text-xl text-muted-foreground max-w-md">
          Move Heavy Equipment Smarter
        </p>
        <div className="mt-2 text-xs font-mono tracking-widest text-primary">
          // LOW LOADER NETWORK
        </div>

        <div className="w-full max-w-sm mt-10 space-y-3">
          <Link
            to="/auth/signup"
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 glow-safety"
          >
            Create Account <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/auth/login"
            className="w-full h-12 rounded-xl glass-strong font-medium inline-flex items-center justify-center"
          >
            Sign In
          </Link>
        </div>
      </div>
      <footer className="pb-6 text-center text-[11px] font-mono text-muted-foreground">
        © LoadLink · Heavy equipment logistics
      </footer>
    </main>
  );
}
