import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Loader2, Upload } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { uploadDriverMedia } from "@/lib/driver-media";
import {
  BLOOD_GROUPS, DEPARTMENTS, DRIVER_DOC_KINDS, EMPLOYMENT_STATUSES, EMPLOYMENT_TYPES,
  GENDERS, LICENCE_CLASSES,
} from "@/lib/driver-data-model";

export const Route = createFileRoute("/_protected/dashboard/fleet/drivers/new")({
  component: AddDriverWizard,
});

const STEPS = ["Personal", "Licence", "Employment", "Vehicle", "Documents", "Review"];

type PendingDoc = { kind: string; label: string; file: File; expires_on: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-border bg-card h-11 px-3 text-sm outline-none focus:border-primary";

function AddDriverWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [trucks, setTrucks] = useState<{ id: string; plate: string; truck_model: string }[]>([]);
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);

  const [s, setS] = useState({
    full_name: "", employee_id: "", date_of_birth: "", gender: "", national_id_no: "",
    passport_no: "", phone: "", email: "", address: "",
    emergency_contact_name: "", emergency_contact_phone: "", blood_group: "Unknown",
    licence_no: "", licence_class: "CE", licence_issue_date: "", licence_expiry: "", medical_expiry: "",
    branch: "", department: "Operations", hire_date: "", employment_type: "Permanent",
    employment_status: "active", years_experience: "",
    assigned_truck_id: "", notes: "",
  });
  const set = (p: Partial<typeof s>) => setS((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    if (!user) return;
    supabase.from("trucks").select("id, plate, truck_model").eq("owner_id", user.id)
      .then(({ data }) => setTrucks((data as any) ?? []));
  }, [user]);

  const canNext = () => {
    if (step === 1) return s.full_name.trim().length > 1 && s.phone.trim().length >= 7;
    if (step === 2) return s.licence_no.trim().length > 2 && !!s.licence_expiry;
    return true;
  };

  const submit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let photoPath: string | null = null;
      if (photo) photoPath = await uploadDriverMedia(user.id, photo, "photos");

      const { data, error } = await supabase.from("drivers").insert({
        owner_id: user.id,
        full_name: s.full_name.trim(),
        employee_id: s.employee_id.trim() || null,
        photo_url: photoPath,
        date_of_birth: s.date_of_birth || null,
        gender: s.gender || null,
        national_id_no: s.national_id_no.trim() || null,
        passport_no: s.passport_no.trim() || null,
        phone: s.phone.trim() || null,
        email: s.email.trim() || null,
        address: s.address.trim() || null,
        emergency_contact_name: s.emergency_contact_name.trim() || null,
        emergency_contact_phone: s.emergency_contact_phone.trim() || null,
        blood_group: s.blood_group === "Unknown" ? null : s.blood_group,
        licence_no: s.licence_no.trim() || null,
        licence_class: s.licence_class || null,
        licence_issue_date: s.licence_issue_date || null,
        licence_expiry: s.licence_expiry || null,
        medical_expiry: s.medical_expiry || null,
        branch: s.branch.trim() || null,
        department: s.department || null,
        hire_date: s.hire_date || null,
        employment_type: s.employment_type,
        employment_status: s.employment_status,
        years_experience: s.years_experience ? Number(s.years_experience) : null,
        assigned_truck_id: s.assigned_truck_id || null,
        notes: s.notes.trim() || null,
        status: "available" as const,
      }).select("id").single();
      if (error) throw error;

      for (const d of docs) {
        const path = await uploadDriverMedia(user.id, d.file, "docs");
        await supabase.from("driver_documents").insert({
          driver_id: data.id, uploaded_by: user.id, kind: d.kind,
          label: d.label || null, file_path: path, expires_on: d.expires_on || null,
        });
      }

      toast.success(`${s.full_name} added to your team`);
      navigate({ to: "/dashboard/fleet/drivers/$driverId", params: { driverId: data.id } });
    } catch (e: any) {
      toast.error(e.message ?? "Could not save driver");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell title="Add driver" role="Fleet">
      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1.5 rounded-full ${i < step ? "bg-primary" : "bg-secondary"}`} />
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
        Step {step} of {STEPS.length} · {STEPS[step - 1]}
      </div>

      <div className="card-elevated p-4 mt-3 space-y-3">
        {step === 1 && (
          <>
            <Field label="Full name"><input className={inputCls} maxLength={100} value={s.full_name} onChange={(e) => set({ full_name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Employee ID"><input className={inputCls} maxLength={40} value={s.employee_id} onChange={(e) => set({ employee_id: e.target.value })} /></Field>
              <Field label="Date of birth"><input type="date" className={inputCls} value={s.date_of_birth} onChange={(e) => set({ date_of_birth: e.target.value })} /></Field>
              <Field label="Gender">
                <select className={inputCls} value={s.gender} onChange={(e) => set({ gender: e.target.value })}>
                  <option value="">—</option>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Blood group">
                <select className={inputCls} value={s.blood_group} onChange={(e) => set({ blood_group: e.target.value })}>
                  {BLOOD_GROUPS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="National ID"><input className={inputCls} maxLength={40} value={s.national_id_no} onChange={(e) => set({ national_id_no: e.target.value })} /></Field>
              <Field label="Passport no."><input className={inputCls} maxLength={40} value={s.passport_no} onChange={(e) => set({ passport_no: e.target.value })} /></Field>
              <Field label="Phone"><input className={inputCls} maxLength={20} value={s.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
              <Field label="Email"><input className={inputCls} maxLength={120} value={s.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            </div>
            <Field label="Address"><input className={inputCls} maxLength={160} value={s.address} onChange={(e) => set({ address: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Emergency contact"><input className={inputCls} maxLength={100} value={s.emergency_contact_name} onChange={(e) => set({ emergency_contact_name: e.target.value })} /></Field>
              <Field label="Emergency phone"><input className={inputCls} maxLength={20} value={s.emergency_contact_phone} onChange={(e) => set({ emergency_contact_phone: e.target.value })} /></Field>
            </div>
            <Field label="Profile photo">
              <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground press cursor-pointer">
                <Upload className="h-4 w-4" /> {photo ? photo.name : "Upload portrait"}
                <input type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
              </label>
            </Field>
          </>
        )}

        {step === 2 && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Licence number"><input className={inputCls} maxLength={40} value={s.licence_no} onChange={(e) => set({ licence_no: e.target.value })} /></Field>
            <Field label="Class">
              <select className={inputCls} value={s.licence_class} onChange={(e) => set({ licence_class: e.target.value })}>
                {LICENCE_CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Issued"><input type="date" className={inputCls} value={s.licence_issue_date} onChange={(e) => set({ licence_issue_date: e.target.value })} /></Field>
            <Field label="Expires"><input type="date" className={inputCls} value={s.licence_expiry} onChange={(e) => set({ licence_expiry: e.target.value })} /></Field>
            <Field label="Medical expiry"><input type="date" className={inputCls} value={s.medical_expiry} onChange={(e) => set({ medical_expiry: e.target.value })} /></Field>
            <Field label="Years experience"><input type="number" min={0} max={60} className={inputCls} value={s.years_experience} onChange={(e) => set({ years_experience: e.target.value })} /></Field>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hire date"><input type="date" className={inputCls} value={s.hire_date} onChange={(e) => set({ hire_date: e.target.value })} /></Field>
            <Field label="Employment type">
              <select className={inputCls} value={s.employment_type} onChange={(e) => set({ employment_type: e.target.value })}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select className={inputCls} value={s.department} onChange={(e) => set({ department: e.target.value })}>
                {DEPARTMENTS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Branch"><input className={inputCls} maxLength={60} value={s.branch} onChange={(e) => set({ branch: e.target.value })} /></Field>
            <Field label="Employment status">
              <select className={inputCls} value={s.employment_status} onChange={(e) => set({ employment_status: e.target.value })}>
                {EMPLOYMENT_STATUSES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 4 && (
          <>
            <div className="text-sm font-semibold">Vehicle assignment</div>
            <div className="space-y-1.5 max-h-64 overflow-auto">
              <button
                onClick={() => set({ assigned_truck_id: "" })}
                className={`w-full text-left rounded-xl border p-3 text-sm press ${!s.assigned_truck_id ? "border-primary bg-primary-soft" : "border-border bg-secondary/50"}`}
              >
                No vehicle for now
              </button>
              {trucks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => set({ assigned_truck_id: t.id })}
                  className={`w-full text-left rounded-xl border p-3 press ${s.assigned_truck_id === t.id ? "border-primary bg-primary-soft" : "border-border bg-secondary/50"}`}
                >
                  <div className="text-sm font-semibold">{t.plate}</div>
                  <div className="text-[11px] text-muted-foreground">{t.truck_model}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="text-sm font-semibold">Documents</div>
            <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground press cursor-pointer">
              <Upload className="h-4 w-4" /> Add document
              <input
                type="file" hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setDocs((d) => [...d, { kind: "licence", label: f.name, file: f, expires_on: "" }]);
                  e.target.value = "";
                }}
              />
            </label>
            {docs.map((d, i) => (
              <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                <div className="text-xs font-medium truncate">{d.file.name}</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className={inputCls}
                    value={d.kind}
                    onChange={(e) => setDocs((prev) => prev.map((x, j) => j === i ? { ...x, kind: e.target.value } : x))}
                  >
                    {DRIVER_DOC_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
                  </select>
                  <input
                    type="date" className={inputCls} value={d.expires_on}
                    onChange={(e) => setDocs((prev) => prev.map((x, j) => j === i ? { ...x, expires_on: e.target.value } : x))}
                  />
                </div>
                <button className="text-[11px] text-destructive press" onClick={() => setDocs((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            ))}
          </>
        )}

        {step === 6 && (
          <div className="text-sm space-y-2">
            <div className="text-sm font-semibold">Review & confirm</div>
            {[
              ["Name", s.full_name || "—"],
              ["Employee ID", s.employee_id || "—"],
              ["Phone", s.phone || "—"],
              ["Licence", `${s.licence_no || "—"} · Class ${s.licence_class}`],
              ["Licence expiry", s.licence_expiry || "—"],
              ["Employment", `${s.employment_type} · ${s.department}`],
              ["Vehicle", trucks.find((t) => t.id === s.assigned_truck_id)?.plate ?? "Unassigned"],
              ["Documents", `${docs.length} file(s)`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs">{k}</span>
                <span className="font-medium text-right truncate">{v}</span>
              </div>
            ))}
            <textarea
              className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none"
              rows={3} maxLength={400} placeholder="Internal notes (optional)"
              value={s.notes} onChange={(e) => set({ notes: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="sticky bottom-24 mt-3 flex items-center gap-2">
        <button
          onClick={() => (step === 1 ? navigate({ to: "/dashboard/fleet/drivers" }) : setStep(step - 1))}
          className="h-12 px-4 rounded-2xl bg-secondary text-sm font-semibold inline-flex items-center gap-1 press"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < STEPS.length ? (
          <button
            onClick={() => canNext() ? setStep(step + 1) : toast.error("Please complete the required fields")}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 shadow-glow press"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 shadow-glow press disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save driver
          </button>
        )}
      </div>
    </DashboardShell>
  );
}
