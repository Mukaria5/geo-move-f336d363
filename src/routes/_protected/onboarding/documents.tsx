import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload, Check, Loader2, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, dashboardPath } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/_protected/onboarding/documents")({ component: Documents });

type DocType = "national_id" | "driving_license" | "truck_logbook" | "insurance" | "ntsa_inspection" | "company_registration";

const DRIVER_DOCS: { id: DocType; label: string; desc: string }[] = [
  { id: "national_id", label: "National ID", desc: "Front and back, clear photo" },
  { id: "driving_license", label: "Driving License", desc: "Valid Kenyan license" },
  { id: "truck_logbook", label: "Truck Logbook", desc: "NTSA logbook" },
  { id: "insurance", label: "Insurance Cover", desc: "Valid PSV / commercial cover" },
  { id: "ntsa_inspection", label: "NTSA Inspection", desc: "Latest inspection certificate" },
];

const FLEET_DOCS: { id: DocType; label: string; desc: string }[] = [
  { id: "company_registration", label: "Company Registration", desc: "Certificate of incorporation" },
  { id: "insurance", label: "Insurance Cover", desc: "Fleet insurance certificate" },
];

function Documents() {
  const { user, role, refresh } = useAuth();
  const navigate = useNavigate();
  const [uploaded, setUploaded] = useState<Record<DocType, boolean>>({} as any);
  const [busyDoc, setBusyDoc] = useState<DocType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const required = role === "driver" ? DRIVER_DOCS : role === "fleet" ? FLEET_DOCS : [];

  useEffect(() => {
    if (!role) navigate({ to: "/onboarding/role" });
    if (role === "client") navigate({ to: dashboardPath("client") });
  }, [role, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("documents").select("doc_type").eq("user_id", user.id).then(({ data }) => {
      if (data) {
        const map = data.reduce((acc, d) => ({ ...acc, [d.doc_type as DocType]: true }), {});
        setUploaded(map as any);
      }
    });
  }, [user]);

  async function upload(doc: DocType, file: File) {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setBusyDoc(doc);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/${doc}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); setBusyDoc(null); return; }
    const { error: dbErr } = await supabase.from("documents").insert({ user_id: user.id, doc_type: doc, file_path: path });
    if (dbErr) { toast.error(dbErr.message); setBusyDoc(null); return; }
    setUploaded((u) => ({ ...u, [doc]: true }));
    setBusyDoc(null);
    toast.success(`${doc.replace("_", " ")} uploaded`);
  }

  const allDone = required.every((d) => uploaded[d.id]);

  async function finish() {
    if (!user) return;
    setSubmitting(true);
    await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
    await refresh();
    setSubmitting(false);
    toast.success("Submitted for verification");
    navigate({ to: dashboardPath(role) });
  }

  return (
    <AuthShell
      title="Upload your documents"
      subtitle="Our team verifies these within 24 hours. You can still browse the app while we review."
    >
      <div className="space-y-2.5">
        {required.map((d) => {
          const done = uploaded[d.id];
          return (
            <label key={d.id} className={`block rounded-xl p-4 border transition-all cursor-pointer ${
              done ? "border-primary/60 bg-primary/5" : "border-border bg-secondary/60 hover:border-primary/40"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg grid place-items-center ${done ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {done ? <Check className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{d.label}</div>
                  <div className="text-xs text-muted-foreground">{d.desc}</div>
                </div>
                <div className={`h-9 px-3 rounded-lg text-xs font-mono inline-flex items-center gap-1.5 ${
                  done ? "text-primary" : "glass"
                }`}>
                  {busyDoc === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? "UPLOADED" : <><Upload className="h-3.5 w-3.5" /> UPLOAD</>}
                </div>
              </div>
              <input type="file" accept="image/*,application/pdf" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(d.id, f); }} />
            </label>
          );
        })}
        <button
          onClick={finish}
          disabled={!allDone || submitting}
          className="w-full mt-3 h-11 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-40 glow-safety"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for verification"}
        </button>
        <p className="text-[11px] text-muted-foreground text-center pt-1 inline-flex items-center justify-center gap-1.5 w-full">
          <ShieldCheck className="h-3 w-3" /> Documents are encrypted and only seen by our verification team.
        </p>
      </div>
    </AuthShell>
  );
}
