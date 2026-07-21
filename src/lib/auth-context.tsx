import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "client" | "driver" | "fleet" | "admin" | "dispatcher";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  onboarded: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserMeta = async (uid: string | undefined) => {
    if (!uid) {
      setRole(null);
      setOnboarded(false);
      return;
    }
    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("profiles").select("onboarded").eq("id", uid).maybeSingle(),
    ]);
    setRole((roleRow?.role as AppRole) ?? null);
    setOnboarded(profile?.onboarded ?? false);
  };

  useEffect(() => {
    // Set listener BEFORE checking session
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      // defer to avoid deadlock
      setTimeout(() => {
        loadUserMeta(s?.user?.id).finally(() => setLoading(false));
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      loadUserMeta(s?.user?.id).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    await loadUserMeta(user?.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setOnboarded(false);
  };

  return (
    <Ctx.Provider value={{ user, session, role, onboarded, loading, refresh, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside <AuthProvider>");
  return c;
}

export function dashboardPath(role: AppRole | null): string {
  switch (role) {
    case "driver": return "/dashboard/driver";
    case "fleet": return "/dashboard/fleet";
    case "admin": return "/dashboard/admin";
    case "dispatcher": return "/dashboard/orders";
    case "client": return "/dashboard/client";
    default: return "/onboarding/role";
  }
}
