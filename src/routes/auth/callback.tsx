import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dashboardPath } from "@/lib/auth-context";

export const Route = createFileRoute("/auth/callback")({ component: Callback });

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Give Supabase a tick to detect URL hash session
      await new Promise((r) => setTimeout(r, 200));
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = data.session?.user.id;
      if (!uid) { navigate({ to: "/auth/login" }); return; }
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
        supabase.from("profiles").select("onboarded").eq("id", uid).maybeSingle(),
      ]);
      if (!roleRow?.role) { navigate({ to: "/onboarding/role" }); return; }
      if (!profile?.onboarded) { navigate({ to: "/onboarding/profile" }); return; }
      navigate({ to: dashboardPath(roleRow.role as any) });
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
