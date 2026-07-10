import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Truck, ArrowRight } from "lucide-react";
import { useAuth, dashboardPath } from "@/lib/auth-context";
import { SplashScreen } from "@/components/SplashScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LoadLink — Move Heavy Equipment Smarter" },
      { name: "description", content: "On-demand low loader transport. Book, dispatch, and track heavy equipment in real time." },
    ],
  }),
  component: Welcome,
});

const SPLASH_KEY = "ll_splash_shown";

function Welcome() {
  const { user, role, onboarded, loading } = useAuth();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(SPLASH_KEY) !== "1";
  });

  // Splash timer — 2.4s then dismiss.
  useEffect(() => {
    if (!showSplash) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(SPLASH_KEY, "1");
      setShowSplash(false);
    }, 2400);
    return () => clearTimeout(t);
  }, [showSplash]);

  // Auto-redirect authenticated users to their dashboard after splash.
  useEffect(() => {
    if (showSplash || loading || !user) return;
    if (!role) { navigate({ to: "/onboarding/role" }); return; }
    if (!onboarded) { navigate({ to: "/onboarding/profile" }); return; }
    navigate({ to: dashboardPath(role) });
  }, [user, role, onboarded, loading, navigate, showSplash]);

  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen key="splash" />
      </AnimatePresence>
    );
  }

  if (loading || user) {
    // Signed in — splash is done, redirect effect will fire.
    return <div className="min-h-screen bg-background" />;
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
