import { Link, useNavigate } from "@tanstack/react-router";
import { Truck, LogOut, Bell } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

export function DashboardShell({ title, role, children }: { title: string; role: string; children: ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth/login" });
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 px-3 sm:px-4 pt-3">
        <div className="glass-strong rounded-2xl flex items-center gap-3 p-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center">
              <Truck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-lg hidden sm:block">
              Load<span className="text-gradient-safety">Link</span>
            </span>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-mono text-primary tracking-widest uppercase">{role}</div>
            <div className="text-sm font-semibold truncate">{title}</div>
          </div>
          <button className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5">
            <Bell className="h-4 w-4" />
          </button>
          <button onClick={handleSignOut} className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/5" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="p-3 sm:p-4 max-w-6xl mx-auto">{children}</div>
      {user && <div className="text-[10px] text-muted-foreground text-center pb-6 font-mono">{user.email}</div>}
    </main>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
