import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Activity, AlertCircle, ArrowDownToLine, ArrowLeft, BadgeCheck, Bell, Building2, Check, CheckCircle2,
  ChevronRight, CircleDollarSign, ClipboardList, Copy, ExternalLink, FileKey2, ImagePlus, LoaderCircle,
  LockKeyhole, Mail, Map, Plug, Plus, RefreshCw, Search, ShieldCheck, Trash2, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import {
  COMPANY_DEFAULTS, COMPANY_SETTINGS_SECTIONS, ROLE_LABELS, defaultCompanySettings,
  mergeSettingsRecord, type CompanyInviteRole, type CompanySettingsDraft, type SettingsRecord,
  type SettingsSectionKey,
} from "@/lib/company-settings";
import type { Database, Json } from "@/integrations/supabase/types";

type CompanyRow = Database["public"]["Tables"]["fleet_companies"]["Row"];
type MemberRow = Database["public"]["Tables"]["company_members"]["Row"];
type AuditRow = Database["public"]["Tables"]["company_audit_logs"]["Row"];
type ProfileDraft = Pick<CompanyRow,
  | "company_name" | "display_name" | "registration_no" | "kra_pin" | "contact_email" | "contact_phone"
  | "alternative_phone" | "physical_address" | "city" | "county" | "country" | "postal_address"
  | "website" | "business_description" | "timezone" | "preferred_language" | "date_format" | "currency"
  | "invoice_footer" | "bank_details" | "mpesa_details" | "logo_path"
>;

const PROFILE_FIELDS: { key: keyof ProfileDraft; label: string; placeholder?: string; type?: string }[] = [
  { key: "company_name", label: "Registered company name" },
  { key: "display_name", label: "Workspace display name" },
  { key: "registration_no", label: "Company registration number" },
  { key: "kra_pin", label: "KRA PIN" },
  { key: "contact_email", label: "Company email", type: "email" },
  { key: "contact_phone", label: "Primary phone", type: "tel" },
  { key: "alternative_phone", label: "Alternative phone", type: "tel" },
  { key: "physical_address", label: "Physical address" },
  { key: "city", label: "City" },
  { key: "county", label: "County" },
  { key: "country", label: "Country" },
  { key: "postal_address", label: "Postal address" },
  { key: "website", label: "Website", type: "url" },
  { key: "timezone", label: "Timezone" },
  { key: "preferred_language", label: "Preferred language" },
  { key: "date_format", label: "Date format" },
  { key: "currency", label: "Company currency" },
];

const ROLE_PERMISSION_ROWS: { module: string; matrix: Record<AppRole, string> }[] = [
  { module: "Dashboard & KPIs", matrix: { admin: "Platform-wide", fleet: "Company-wide", manager: "Company-wide", dispatcher: "Delivery and fleet", driver: "Personal trips", client: "Own activity" } },
  { module: "Orders & dispatch", matrix: { admin: "All companies", fleet: "Own company", manager: "Own company", dispatcher: "Own company", driver: "Assigned trips", client: "Own orders" } },
  { module: "Fleet & drivers", matrix: { admin: "All companies", fleet: "Own company", manager: "Own company", dispatcher: "View company fleet", driver: "Assigned vehicle", client: "No access" } },
  { module: "Clients & CRM", matrix: { admin: "All companies", fleet: "Own company", manager: "Own company", dispatcher: "No access", driver: "No access", client: "Own profile" } },
  { module: "Finance", matrix: { admin: "Platform review", fleet: "Own company", manager: "Own company", dispatcher: "No access", driver: "Own earnings", client: "Own invoices" } },
  { module: "Reports", matrix: { admin: "All reports", fleet: "All company reports", manager: "Company reports", dispatcher: "Operations reports", driver: "Own trips", client: "Own orders" } },
  { module: "Company administration", matrix: { admin: "Platform console", fleet: "Manage company", manager: "No access", dispatcher: "No access", driver: "No access", client: "No access" } },
];

const INTEGRATIONS = [
  { name: "OpenStreetMap", description: "Map tiles used by the fleet and live tracking maps.", status: "In use", icon: Map },
  { name: "OpenStreetMap search", description: "Place search uses the Nominatim geocoding service.", status: "In use", icon: Map },
  { name: "Google Maps", description: "No Google Maps account or key is configured.", status: "Not connected", icon: Map },
  { name: "GPS provider / Wialon", description: "Vehicle positions currently use device/browser reporting; no provider connection is set up.", status: "Configuration required", icon: Plug },
  { name: "M-Pesa", description: "Record M-Pesa payment details in Finance; automated collection is not connected.", status: "Not connected", icon: CircleDollarSign },
  { name: "Email invitations", description: "Copyable team invitation links work; invitation email delivery is not configured.", status: "Not connected", icon: Mail },
  { name: "WhatsApp Business", description: "No WhatsApp Business account is connected.", status: "Coming soon", icon: Plug },
  { name: "SMS provider", description: "No SMS delivery provider is connected.", status: "Not connected", icon: Plug },
];

const EVENT_GROUPS: { title: string; events: { key: string; label: string }[] }[] = [
  { title: "Orders", events: [{ key: "new_order", label: "New order created" }, { key: "order_assigned", label: "Order assigned" }, { key: "order_delayed", label: "Order delayed" }, { key: "order_completed", label: "Order completed" }, { key: "order_cancelled", label: "Order cancelled" }] },
  { title: "Fleet & drivers", events: [{ key: "maintenance_due", label: "Maintenance due" }, { key: "insurance_expiry", label: "Insurance expiry" }, { key: "inspection_expiry", label: "Inspection expiry" }, { key: "vehicle_unavailable", label: "Vehicle unavailable" }, { key: "licence_expiry", label: "Driver licence expiry" }, { key: "driver_unavailable", label: "Driver unavailable" }, { key: "driver_suspended", label: "Driver suspended" }] },
  { title: "Finance", events: [{ key: "invoice_created", label: "Invoice created" }, { key: "payment_received", label: "Payment received" }, { key: "invoice_overdue", label: "Invoice overdue" }, { key: "expense_submitted", label: "Expense submitted" }] },
  { title: "System", events: [{ key: "user_invitation", label: "New team invitation" }, { key: "user_changes", label: "Team account changes" }, { key: "security_alerts", label: "Security alerts" }] },
];

const OP_REQUIRED_FIELDS = ["pickup_address", "dropoff_address", "cargo_name", "cargo_weight_tons", "pickup_at", "dropoff_at"];
const DRIVER_DOCS = ["driving_license", "national_id", "medical_certificate", "insurance"];
const DRIVER_STATUSES = ["available", "assigned", "driving", "loading", "offloading", "rest_break", "off_duty", "on_leave"];
const PAYMENT_METHODS = ["cash", "bank_transfer", "mobile_money", "cheque", "other"];
const EXPENSE_CATEGORIES = ["fuel", "maintenance", "driver_allowance", "tolls", "repairs", "insurance", "licences", "office", "other"];
const REVENUE_CATEGORIES = ["transport", "loading", "offloading", "fuel_surcharge", "tolls", "other"];

function textRecord(value: unknown): SettingsRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as SettingsRecord : {};
}

function nested(record: SettingsRecord, path: string[]): SettingsRecord {
  let current: unknown = record;
  for (const key of path) current = textRecord(current)[key];
  return textRecord(current);
}

function listValue(record: SettingsRecord, path: string[]): string[] {
  const value = nested(record, path.slice(0, -1))[path[path.length - 1] ?? ""];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function updatePath(record: SettingsRecord, path: string[], value: unknown): SettingsRecord {
  const [head, ...tail] = path;
  if (!head) return record;
  if (tail.length === 0) return { ...record, [head]: value };
  return { ...record, [head]: updatePath(textRecord(record[head]), tail, value) };
}

function csvSafe(value: unknown): string {
  const raw = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  const protectedValue = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${protectedValue.replace(/"/g, '""')}"`;
}

function downloadRows(filename: string, title: string, headers: string[], rows: unknown[][]) {
  const body = [`LoadLink — ${title}`, `Exported ${new Date().toLocaleString()}`, "", headers.map(csvSafe).join(","), ...rows.map((row) => row.map(csvSafe).join(","))].join("\r\n");
  const blob = new Blob(["\uFEFF", body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function SettingsCenter({ section }: { section: "overview" | SettingsSectionKey }) {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [profile, setProfile] = useState<ProfileDraft | null>(null);
  const [preferences, setPreferences] = useState<CompanySettingsDraft>(() => defaultCompanySettings());
  const [settingsExist, setSettingsExist] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditCount, setAuditCount] = useState(0);
  const [auditPage, setAuditPage] = useState(0);
  const [auditModule, setAuditModule] = useState("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamRole, setTeamRole] = useState("all");
  const [teamStatus, setTeamStatus] = useState("all");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "", phone: "", role: "manager" as CompanyInviteRole, department: "", responsibilities: [] as string[] });
  const [securityStatus, setSecurityStatus] = useState("Checking security options…");

  const canManage = role === "fleet";

  const loadData = useCallback(async () => {
    if (!user || role !== "fleet") return;
    setLoading(true);
    setError(null);
    const [companyResult, settingsResult, memberResult] = await Promise.all([
      supabase.from("fleet_companies").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("company_settings").select("*").eq("company_user_id", user.id).maybeSingle(),
      supabase.from("company_members").select("*").eq("company_user_id", user.id).order("invited_at", { ascending: false }).limit(500),
    ]);
    if (companyResult.error) {
      setError("Company details could not be loaded. Please refresh and try again.");
      setLoading(false);
      return;
    }
    const current = companyResult.data;
    if (!current) {
      setError("Complete company verification before managing the workspace.");
      setLoading(false);
      return;
    }
    setCompany(current);
    setProfile({
      company_name: current.company_name,
      display_name: current.display_name ?? current.company_name,
      registration_no: current.registration_no ?? "",
      kra_pin: current.kra_pin ?? "",
      contact_email: current.contact_email ?? user.email ?? "",
      contact_phone: current.contact_phone ?? "",
      alternative_phone: current.alternative_phone ?? "",
      physical_address: current.physical_address ?? "",
      city: current.city ?? "",
      county: current.county ?? "",
      country: current.country || COMPANY_DEFAULTS.country,
      postal_address: current.postal_address ?? "",
      website: current.website ?? "",
      business_description: current.business_description ?? "",
      timezone: current.timezone || COMPANY_DEFAULTS.timezone,
      preferred_language: current.preferred_language || COMPANY_DEFAULTS.preferredLanguage,
      date_format: current.date_format || COMPANY_DEFAULTS.dateFormat,
      currency: current.currency || COMPANY_DEFAULTS.currency,
      invoice_footer: current.invoice_footer ?? "",
      bank_details: current.bank_details ?? "",
      mpesa_details: current.mpesa_details ?? "",
      logo_path: current.logo_path ?? "",
    });
    if (settingsResult.error && settingsResult.error.code !== "PGRST116") {
      setError("Company settings could not be loaded.");
    }
    const defaults = defaultCompanySettings();
    const saved = settingsResult.data;
    setSettingsExist(Boolean(saved));
    setPreferences({
      operational_settings: mergeSettingsRecord(defaults.operational_settings, saved?.operational_settings),
      finance_settings: mergeSettingsRecord(defaults.finance_settings, saved?.finance_settings),
      notification_settings: mergeSettingsRecord(defaults.notification_settings, saved?.notification_settings),
      administration_settings: mergeSettingsRecord(defaults.administration_settings, saved?.administration_settings),
    });
    setMembers(memberResult.data ?? []);
    if (current.logo_path) {
      const { data: signed } = await supabase.storage.from("company-branding").createSignedUrl(current.logo_path, 3600);
      setLogoUrl(signed?.signedUrl ?? null);
    } else setLogoUrl(null);
    setLoading(false);
  }, [role, user]);

  useEffect(() => {
    if (!authLoading && role !== "fleet") navigate({ to: "/dashboard/more", replace: true });
  }, [authLoading, navigate, role]);

  useEffect(() => { void loadData(); }, [loadData]);

  const loadAudit = useCallback(async () => {
    if (!user || role !== "fleet" || section !== "audit") return;
    let query = supabase.from("company_audit_logs").select("*", { count: "exact" }).eq("company_user_id", user.id).order("created_at", { ascending: false });
    if (auditModule !== "all") query = query.eq("module", auditModule);
    if (auditFrom) query = query.gte("created_at", `${auditFrom}T00:00:00.000Z`);
    if (auditTo) query = query.lte("created_at", `${auditTo}T23:59:59.999Z`);
    const needle = auditSearch.trim().replace(/[(),%_]/g, " ");
    if (needle) query = query.ilike("description", `%${needle}%`);
    const { data, count, error: auditError } = await query.range(auditPage * 25, auditPage * 25 + 24);
    if (auditError) toast.error("Audit history could not be loaded.");
    else {
      setAudit(data ?? []);
      setAuditCount(count ?? 0);
    }
  }, [auditFrom, auditModule, auditPage, auditSearch, role, section, user]);

  useEffect(() => { void loadAudit(); }, [loadAudit]);

  useEffect(() => {
    if (section !== "security") return;
    let active = true;
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      if (!active) return;
      const enrolled = data?.all?.length ?? 0;
      setSecurityStatus(enrolled > 0 ? `Two-step verification is enabled (${enrolled} enrolled factor${enrolled === 1 ? "" : "s"}).` : "Two-step verification is not configured for this account.");
    }).catch(() => {
      if (active) setSecurityStatus("Two-step verification status is unavailable.");
    });
    return () => { active = false; };
  }, [section]);

  const updateProfile = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setProfile((old) => old ? { ...old, [key]: value } : old);
  };

  const changePreference = (group: keyof CompanySettingsDraft, path: string[], value: unknown) => {
    setPreferences((current) => ({ ...current, [group]: updatePath(current[group], path, value) }));
  };

  async function saveCompany(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !profile || !canManage) return;
    if (profile.company_name.trim().length < 2) { toast.error("Enter your registered company name."); return; }
    setSaving(true);
    const { error: saveError } = await supabase.from("fleet_companies").update({
      company_name: profile.company_name.trim(),
      display_name: profile.display_name?.trim() || profile.company_name.trim(),
      registration_no: profile.registration_no,
      kra_pin: profile.kra_pin,
      contact_email: profile.contact_email,
      contact_phone: profile.contact_phone,
      alternative_phone: profile.alternative_phone,
      physical_address: profile.physical_address,
      city: profile.city,
      county: profile.county,
      country: profile.country || COMPANY_DEFAULTS.country,
      postal_address: profile.postal_address,
      website: profile.website,
      business_description: profile.business_description,
      timezone: profile.timezone || COMPANY_DEFAULTS.timezone,
      preferred_language: profile.preferred_language || COMPANY_DEFAULTS.preferredLanguage,
      date_format: profile.date_format || COMPANY_DEFAULTS.dateFormat,
      currency: profile.currency || COMPANY_DEFAULTS.currency,
      invoice_footer: profile.invoice_footer,
      bank_details: profile.bank_details,
      mpesa_details: profile.mpesa_details,
    }).eq("user_id", user.id);
    setSaving(false);
    if (saveError) toast.error("Company profile could not be saved.");
    else { toast.success("Company profile saved"); await loadData(); }
  }

  async function savePreferences(group?: keyof CompanySettingsDraft) {
    if (!user || !canManage) return;
    setSaving(true);
    const defaults = defaultCompanySettings();
    const values: Database["public"]["Tables"]["company_settings"]["Insert"] = {
      company_user_id: user.id,
      operational_settings: (group && group !== "operational_settings" && settingsExist ? undefined : preferences.operational_settings) as Json | undefined,
      finance_settings: (group && group !== "finance_settings" && settingsExist ? undefined : preferences.finance_settings) as Json | undefined,
      notification_settings: (group && group !== "notification_settings" && settingsExist ? undefined : preferences.notification_settings) as Json | undefined,
      administration_settings: (group && group !== "administration_settings" && settingsExist ? undefined : preferences.administration_settings) as Json | undefined,
    };
    if (!settingsExist) {
      values.operational_settings = preferences.operational_settings as Json;
      values.finance_settings = preferences.finance_settings as Json;
      values.notification_settings = preferences.notification_settings as Json;
      values.administration_settings = preferences.administration_settings as Json;
    }
    const { error: saveError } = await supabase.from("company_settings").upsert(values, { onConflict: "company_user_id" });
    setSaving(false);
    if (saveError) toast.error("Settings could not be saved.");
    else {
      setSettingsExist(true);
      toast.success("Settings saved");
      if (group === "operational_settings") await supabase.from("company_audit_logs").select("id", { head: true, count: "exact" }).eq("company_user_id", user.id);
      await loadData();
    }
  }

  async function uploadLogo(file?: File) {
    if (!user || !profile || !file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Company logos must be 5 MB or smaller."); return; }
    setSaving(true);
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "img";
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("company-branding").upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) { setSaving(false); toast.error("The company logo could not be uploaded."); return; }
    const { error: updateError } = await supabase.from("fleet_companies").update({ logo_path: path }).eq("user_id", user.id);
    setSaving(false);
    if (updateError) { await supabase.storage.from("company-branding").remove([path]); toast.error("The company logo could not be saved."); return; }
    toast.success("Company logo updated");
    await loadData();
  }

  async function removeLogo() {
    if (!user || !profile?.logo_path) return;
    if (!window.confirm("Remove the company logo?")) return;
    setSaving(true);
    const oldPath = profile.logo_path;
    const { error: updateError } = await supabase.from("fleet_companies").update({ logo_path: null }).eq("user_id", user.id);
    if (!updateError) await supabase.storage.from("company-branding").remove([oldPath]);
    setSaving(false);
    if (updateError) toast.error("The company logo could not be removed.");
    else { toast.success("Company logo removed"); await loadData(); }
  }

  async function createInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !canManage) return;
    setInviteBusy(true);
    const { data, error: inviteError } = await supabase.rpc("create_company_invitation", {
      _email: inviteForm.email.trim().toLowerCase(), _full_name: inviteForm.full_name.trim(),
      _phone: inviteForm.phone || undefined, _department: inviteForm.department || undefined,
      _role: inviteForm.role, _responsibilities: inviteForm.responsibilities as Json,
    });
    setInviteBusy(false);
    if (inviteError || !data?.[0]) { toast.error(inviteError?.message ?? "The invitation could not be created."); return; }
    const url = `${window.location.origin}/auth/signup?invite=${data[0].invitation_token}`;
    setInviteUrl(url);
    setInviteForm({ full_name: "", email: "", phone: "", role: "manager", department: "", responsibilities: [] });
    toast.success("Invitation link created. It expires in seven days.");
    await loadData();
  }

  async function copyInvite(member: MemberRow) {
    const url = `${window.location.origin}/auth/signup?invite=${member.invitation_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setInviteUrl(url);
      toast.success("Invitation link copied");
    } catch {
      setInviteUrl(url);
      toast.error("Copy is unavailable here. Select the invitation link shown below.");
    }
  }

  async function memberAction(member: MemberRow, action: string, values?: { status?: string; role?: CompanyInviteRole }) {
    if (member.company_user_id !== user?.id) return;
    if (action === "status" && values?.status === "deactivated" && !window.confirm(`Deactivate ${member.full_name}? They will lose company access.`)) return;
    const { error: actionError } = await supabase.rpc("manage_company_member", {
      _member_id: member.id, _action: action, _status: values?.status,
      _role: values?.role, _department: member.department ?? undefined,
      _responsibilities: member.responsibilities,
    });
    if (actionError) toast.error(actionError.message);
    else { toast.success(action === "resend" ? "Invitation link renewed" : "Team access updated"); await loadData(); }
  }

  async function sendRecovery(email: string) {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/reset-password` });
    if (resetError) toast.error("Password recovery email could not be sent.");
    else toast.success("Password recovery email sent");
  }

  async function exportCompanyData(table: string, title: string) {
    const client = supabase as unknown as { from: (name: string) => { select: (columns: string) => { order: (column: string, options: { ascending: boolean }) => { limit: (amount: number) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }> } } } };
    const { data, error: exportError } = await client.from(table).select("*").order("created_at", { ascending: false }).limit(10000);
    if (exportError) { toast.error("This company export could not be prepared."); return; }
    const rows = data ?? [];
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    if (columns.length === 0) { downloadRows(table, `${company?.display_name || company?.company_name || "Company"} — ${title}`, ["No records"], []); return; }
    downloadRows(table, `${company?.display_name || company?.company_name || "Company"} — ${title}`, columns, rows.map((row) => columns.map((key) => row[key])));
    toast.success(`${rows.length.toLocaleString()} ${title.toLowerCase()} exported`);
  }

  if (authLoading || loading) {
    return <DashboardShell title="Company settings" role="Administration"><div className="grid min-h-64 place-items-center"><LoaderCircle className="h-6 w-6 animate-spin text-primary" /></div></DashboardShell>;
  }

  if (!canManage) return <DashboardShell title="Company settings" role="Administration"><div className="card-elevated p-5"><ShieldCheck className="h-5 w-5 text-warning" /><h2 className="mt-3 font-display text-lg">Company owner access required</h2><p className="mt-1 text-sm text-muted-foreground">Only the company owner can manage workspace settings and invitations.</p></div></DashboardShell>;

  if (error || !company || !profile) {
    return <DashboardShell title="Company settings" role="Administration"><div className="card-elevated p-5"><AlertCircle className="h-5 w-5 text-warning" /><p className="mt-3 text-sm">{error ?? "Company details are not available."}</p><Button className="mt-4" variant="outline" onClick={() => void loadData()}>Try again</Button></div></DashboardShell>;
  }

  const activeSection = COMPANY_SETTINGS_SECTIONS.find((entry) => entry.key === section);
  const settingsLabel = activeSection?.label ?? "Administration overview";
  const activeMembers = members.filter((member) => member.status === "active").length;
  const invitedMembers = members.filter((member) => member.status === "invited" || member.status === "pending").length;
  const suspendedMembers = members.filter((member) => member.status === "suspended" || member.status === "deactivated").length;
  const companyProfileComplete = Boolean(profile.company_name.trim() && profile.registration_no?.trim() && profile.kra_pin?.trim() && profile.contact_email?.trim() && profile.contact_phone?.trim());
  const rolesReviewed = preferences.administration_settings.roles_reviewed === true;
  const integrationsReviewed = preferences.administration_settings.integrations_reviewed === true;
  const items = [
    { label: "Company profile completed", complete: companyProfileComplete, key: "company" as const },
    { label: "Company logo uploaded", complete: Boolean(profile.logo_path), key: "company" as const },
    { label: "Team configured", complete: members.length > 0, key: "team" as const },
    { label: "Roles reviewed", complete: rolesReviewed, key: "roles" as const },
    { label: "Finance settings saved", complete: settingsExist, key: "finance" as const },
    { label: "Operational settings saved", complete: settingsExist, key: "operations" as const },
    { label: "Integrations reviewed", complete: integrationsReviewed, key: "integrations" as const },
  ];
  const teamRows = members.filter((member) => {
    const needle = teamSearch.toLowerCase().trim();
    return (!needle || `${member.full_name} ${member.email} ${member.department ?? ""}`.toLowerCase().includes(needle))
      && (teamRole === "all" || member.role === teamRole)
      && (teamStatus === "all" || member.status === teamStatus);
  });

  return (
    <DashboardShell title={company.display_name || company.company_name} role="Company administration">
      <div className="mb-4 flex items-center gap-3">
        {section !== "overview" && <Button asChild variant="ghost" size="icon" aria-label="Back to administration overview"><Link to="/dashboard/settings"><ArrowLeft className="h-4 w-4" /></Link></Button>}
        <div className="min-w-0"><div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Workspace administration</div><h1 className="mt-1 font-display text-xl font-semibold">{settingsLabel}</h1></div>
      </div>

      <div className="mb-4 overflow-x-auto no-scrollbar lg:hidden">
        <div className="flex w-max gap-2 pb-1">
          <Button asChild size="sm" variant={section === "overview" ? "default" : "outline"}><Link to="/dashboard/settings">Overview</Link></Button>
          {COMPANY_SETTINGS_SECTIONS.map((item) => <Button asChild key={item.key} size="sm" variant={section === item.key ? "default" : "outline"}><Link to="/dashboard/settings/$section" params={{ section: item.key }}>{item.label}</Link></Button>)}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <aside className="hidden lg:block">
          <nav className="space-y-1" aria-label="Company settings">
            <Link to="/dashboard/settings" className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${section === "overview" ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><Activity className="h-4 w-4" /> Overview</Link>
            {COMPANY_SETTINGS_SECTIONS.map((item) => <Link key={item.key} to="/dashboard/settings/$section" params={{ section: item.key }} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${section === item.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}><item.icon className="h-4 w-4 shrink-0" /><span className="truncate">{item.label}</span></Link>)}
          </nav>
        </aside>

        <section className="min-w-0" aria-live="polite">
          {section === "overview" && <OverviewPanel company={company} memberCount={members.length + 1} active={activeMembers} invited={invitedMembers} suspended={suspendedMembers} items={items} />}
          {section === "company" && <CompanyProfilePanel profile={profile} logoUrl={logoUrl} saving={saving} updateProfile={updateProfile} onSave={saveCompany} onUpload={uploadLogo} onRemoveLogo={removeLogo} onReset={() => { if (company) { setProfile({ ...profile, company_name: company.company_name, display_name: company.display_name ?? company.company_name }); toast.message("Unsaved name changes restored."); } }} />}
          {section === "team" && <TeamPanel members={teamRows} allMembers={members} search={teamSearch} setSearch={setTeamSearch} roleFilter={teamRole} setRoleFilter={setTeamRole} statusFilter={teamStatus} setStatusFilter={setTeamStatus} inviteOpen={showInvite} setInviteOpen={setShowInvite} inviteForm={inviteForm} setInviteForm={setInviteForm} inviteUrl={inviteUrl} setInviteUrl={setInviteUrl} inviteBusy={inviteBusy} onInvite={createInvite} onAction={memberAction} onCopy={copyInvite} onResend={(member) => void memberAction(member, "resend")} onRecovery={sendRecovery} />}
          {section === "roles" && <RolesPanel reviewed={rolesReviewed} onReview={() => { changePreference("administration_settings", ["roles_reviewed"], true); void savePreferences("administration_settings"); }} />}
          {section === "operations" && <OperationsPanel record={preferences.operational_settings} onChange={(path, value) => changePreference("operational_settings", path, value)} onSave={() => void savePreferences("operational_settings")} saving={saving} />}
          {section === "finance" && <FinancePanel record={preferences.finance_settings} onChange={(path, value) => changePreference("finance_settings", path, value)} onSave={() => void savePreferences("finance_settings")} saving={saving} />}
          {section === "notifications" && <NotificationsPanel record={preferences.notification_settings} onChange={(path, value) => changePreference("notification_settings", path, value)} onSave={() => void savePreferences("notification_settings")} saving={saving} />}
          {section === "security" && <SecurityPanel userEmail={user?.email ?? null} securityStatus={securityStatus} onRecovery={() => user?.email && void sendRecovery(user.email)} />}
          {section === "integrations" && <IntegrationsPanel reviewed={integrationsReviewed} onReview={() => { changePreference("administration_settings", ["integrations_reviewed"], true); void savePreferences("administration_settings"); }} />}
          {section === "audit" && <AuditPanel rows={audit} count={auditCount} page={auditPage} setPage={setAuditPage} module={auditModule} setModule={(value) => { setAuditPage(0); setAuditModule(value); }} search={auditSearch} setSearch={(value) => { setAuditPage(0); setAuditSearch(value); }} from={auditFrom} setFrom={(value) => { setAuditPage(0); setAuditFrom(value); }} to={auditTo} setTo={(value) => { setAuditPage(0); setAuditTo(value); }} />}
          {section === "overview" && <ExportsPanel onExport={exportCompanyData} />}
        </section>
      </div>
    </DashboardShell>
  );
}

function OverviewPanel({ company, memberCount, active, invited, suspended, items }: { company: CompanyRow; memberCount: number; active: number; invited: number; suspended: number; items: { label: string; complete: boolean; key: SettingsSectionKey }[] }) {
  const done = items.filter((item) => item.complete).length;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-4 border-b border-border pb-5">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Building2 className="h-6 w-6" /></div>
      <div className="min-w-0 flex-1"><h2 className="font-display text-xl font-semibold">{company.display_name || company.company_name}</h2><p className="mt-1 text-sm text-muted-foreground">{company.country || COMPANY_DEFAULTS.country} · {company.currency || COMPANY_DEFAULTS.currency} · {company.timezone || COMPANY_DEFAULTS.timezone}</p></div>
      <Button asChild variant="outline"><Link to="/dashboard/settings/$section" params={{ section: "company" }}>Edit company profile</Link></Button>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Summary label="Total users" value={memberCount} icon={Users} />
      <Summary label="Active" value={active + 1} icon={CheckCircle2} />
      <Summary label="Invited" value={invited} icon={Mail} />
      <Summary label="Suspended" value={suspended} icon={LockKeyhole} />
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(250px,.8fr)]">
      <div><div className="mb-2 flex items-end justify-between"><div><h2 className="font-display text-lg font-semibold">Workspace setup</h2><p className="mt-1 text-sm text-muted-foreground">{done} of {items.length} items complete</p></div><span className="text-sm font-semibold text-primary">{Math.round((done / items.length) * 100)}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((done / items.length) * 100)}%` }} /></div>
        <div className="mt-3 divide-y divide-border border-y border-border">{items.map((item) => <Link key={item.label} to="/dashboard/settings/$section" params={{ section: item.key }} className="flex min-h-12 items-center gap-3 py-2 text-sm"><span className={`grid h-6 w-6 place-items-center rounded-full ${item.complete ? "status-success" : "bg-secondary text-muted-foreground"}`}>{item.complete ? <Check className="h-3.5 w-3.5" /> : <span className="text-xs">·</span>}</span><span className="flex-1">{item.label}</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>)}</div>
      </div>
      <div><h2 className="font-display text-lg font-semibold">Administration</h2><div className="mt-3 divide-y divide-border border-y border-border">{COMPANY_SETTINGS_SECTIONS.map((item) => <Link key={item.key} to="/dashboard/settings/$section" params={{ section: item.key }} className="flex min-h-14 items-center gap-3 py-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><item.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span><ChevronRight className="h-4 w-4 text-muted-foreground" /></Link>)}</div></div>
    </div>
  </div>;
}

function Summary({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return <div className="border-b border-border pb-3"><Icon className="h-4 w-4 text-primary" /><div className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</div><div className="mt-0.5 text-xs text-muted-foreground">{label}</div></div>;
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="text-sm font-semibold">{label}</span>{children}{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</label>;
}

function PanelHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4"><div><h2 className="font-display text-lg font-semibold">{title}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p></div>{action}</div>;
}

function CompanyProfilePanel({ profile, logoUrl, saving, updateProfile, onSave, onUpload, onRemoveLogo, onReset }: {
  profile: ProfileDraft; logoUrl: string | null; saving: boolean;
  updateProfile: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void;
  onSave: (e: FormEvent<HTMLFormElement>) => void;
  onUpload: (file?: File) => void; onRemoveLogo: () => void; onReset: () => void;
}) {
  return <form onSubmit={onSave} className="space-y-5">
    <PanelHeader title="Company profile" description="These details identify your business across invoices and workspace administration." />
    <div className="flex flex-wrap items-center gap-4 border-b border-border pb-5"><div className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-secondary">{logoUrl ? <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain" /> : <Building2 className="h-7 w-7 text-muted-foreground" />}</div><div className="flex flex-wrap gap-2"><label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm font-semibold hover:bg-accent"><ImagePlus className="h-4 w-4" />Upload logo<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => { void onUpload(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} /></label>{profile.logo_path && <Button type="button" variant="outline" size="sm" onClick={onRemoveLogo} disabled={saving}><Trash2 className="h-4 w-4" />Remove</Button>}</div><p className="basis-full text-xs text-muted-foreground">PNG, JPEG, WebP, or SVG. Maximum 5 MB. Stored privately for your company.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{PROFILE_FIELDS.map((item) => <Field key={item.key} label={item.label}><Input type={item.type ?? "text"} value={String(profile[item.key] ?? "")} onChange={(event) => updateProfile(item.key, event.target.value)} /></Field>)}</div>
    <Field label="Business description"><Textarea rows={3} value={profile.business_description ?? ""} onChange={(event) => updateProfile("business_description", event.target.value)} placeholder="Briefly describe your transport services" /></Field>
    <Field label="Invoice footer" hint="Shown on future invoices generated for this company."><Textarea rows={2} value={profile.invoice_footer ?? ""} onChange={(event) => updateProfile("invoice_footer", event.target.value)} placeholder="Payment or compliance information" /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Company bank details" hint="Stored in this company workspace."><Textarea rows={3} value={profile.bank_details ?? ""} onChange={(event) => updateProfile("bank_details", event.target.value)} /></Field><Field label="M-Pesa payment details" hint="Details only; automated collection is not connected."><Textarea rows={3} value={profile.mpesa_details ?? ""} onChange={(event) => updateProfile("mpesa_details", event.target.value)} /></Field></div>
    <div className="flex flex-wrap gap-2 border-t border-border pt-4"><Button type="submit" disabled={saving}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save changes</Button><Button type="button" variant="outline" onClick={onReset} disabled={saving}>Cancel name edits</Button></div>
  </form>;
}

function TeamPanel({ members, allMembers, search, setSearch, roleFilter, setRoleFilter, statusFilter, setStatusFilter, inviteOpen, setInviteOpen, inviteForm, setInviteForm, inviteUrl, setInviteUrl, inviteBusy, onInvite, onAction, onCopy, onResend, onRecovery }: {
  members: MemberRow[]; allMembers: MemberRow[]; search: string; setSearch: (v: string) => void;
  roleFilter: string; setRoleFilter: (v: string) => void; statusFilter: string; setStatusFilter: (v: string) => void;
  inviteOpen: boolean; setInviteOpen: (v: boolean) => void;
  inviteForm: { full_name: string; email: string; phone: string; role: CompanyInviteRole; department: string; responsibilities: string[] };
  setInviteForm: React.Dispatch<React.SetStateAction<{ full_name: string; email: string; phone: string; role: CompanyInviteRole; department: string; responsibilities: string[] }>>;
  inviteUrl: string; setInviteUrl: (v: string) => void; inviteBusy: boolean;
  onInvite: (e: FormEvent<HTMLFormElement>) => void;
  onAction: (member: MemberRow, action: string, values?: { status?: string; role?: CompanyInviteRole }) => void;
  onCopy: (member: MemberRow) => void; onResend: (member: MemberRow) => void; onRecovery: (email: string) => void;
}) {
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [editRole, setEditRole] = useState<CompanyInviteRole>("manager");
  const [editDepartment, setEditDepartment] = useState("");
  const [editResponsibilities, setEditResponsibilities] = useState<string[]>([]);
  const responsibilityOptions = ["Orders", "Fleet", "Drivers", "Clients", "Finance", "Dispatch"];
  const visibleRows = members;
  return <div>
    <PanelHeader title="Users & team" description="Manage staff in this company. Invitation links expire after seven days; share them securely." action={<Button onClick={() => setInviteOpen(!inviteOpen)}><Plus className="h-4 w-4" />Invite teammate</Button>} />
    {inviteOpen && <form onSubmit={onInvite} className="mb-5 space-y-4 border-y border-border py-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Full name"><Input required minLength={2} value={inviteForm.full_name} onChange={(e) => setInviteForm((old) => ({ ...old, full_name: e.target.value }))} /></Field><Field label="Email address"><Input required type="email" value={inviteForm.email} onChange={(e) => setInviteForm((old) => ({ ...old, email: e.target.value }))} /></Field><Field label="Phone number"><Input type="tel" value={inviteForm.phone} onChange={(e) => setInviteForm((old) => ({ ...old, phone: e.target.value }))} /></Field><Field label="Department"><Input value={inviteForm.department} onChange={(e) => setInviteForm((old) => ({ ...old, department: e.target.value }))} /></Field><Field label="Role"><Select value={inviteForm.role} onValueChange={(value) => setInviteForm((old) => ({ ...old, role: value as CompanyInviteRole }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manager">Manager</SelectItem><SelectItem value="dispatcher">Dispatcher</SelectItem><SelectItem value="driver">Driver</SelectItem></SelectContent></Select></Field></div>
      <div><div className="mb-2 text-sm font-semibold">Operational responsibilities</div><div className="flex flex-wrap gap-x-4 gap-y-2">{responsibilityOptions.map((option) => <label key={option} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inviteForm.responsibilities.includes(option)} onChange={(e) => setInviteForm((old) => ({ ...old, responsibilities: e.target.checked ? [...old.responsibilities, option] : old.responsibilities.filter((item) => item !== option) }))} />{option}</label>)}</div></div>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={inviteBusy}>{inviteBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Create invitation link</Button><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button></div><p className="text-xs text-muted-foreground">Email invitations are not configured. Create a link, then share it with the invited person.</p></form>}
    {inviteUrl && <div className="mb-5 border-y border-primary/30 bg-primary-soft/40 p-3"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-success" />Invitation link</div><div className="mt-2 flex gap-2"><Input readOnly value={inviteUrl} aria-label="Invitation link" /><Button type="button" variant="outline" size="icon" aria-label="Copy invitation link" onClick={() => { void navigator.clipboard.writeText(inviteUrl).then(() => toast.success("Invitation link copied")).catch(() => toast.error("Select and copy the link manually.")); }}><Copy className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Dismiss invitation link" onClick={() => setInviteUrl("")}><X className="h-4 w-4" /></Button></div><p className="mt-2 text-xs text-muted-foreground">Link expires in seven days and only works for the invited email address.</p></div>}
    <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(180px,1fr)_150px_150px]"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, email, department" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={roleFilter} onValueChange={setRoleFilter}><SelectTrigger aria-label="Filter by role"><SelectValue placeholder="All roles" /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{["manager", "dispatcher", "driver"].map((item) => <SelectItem key={item} value={item}>{ROLE_LABELS[item as AppRole]}</SelectItem>)}</SelectContent></Select><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["active", "invited", "pending", "suspended", "deactivated"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
    <p className="mb-2 text-xs text-muted-foreground">Company owner access is protected and cannot be removed from this list.</p>
    <div className="divide-y divide-border border-y border-border">{visibleRows.map((member) => <article key={member.id} className="py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{member.full_name}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${member.status === "active" ? "status-success" : member.status === "invited" || member.status === "pending" ? "status-warning" : "bg-secondary text-muted-foreground"}`}>{member.status}</span></div><p className="mt-1 break-all text-sm text-muted-foreground">{member.email}</p><p className="mt-1 text-xs text-muted-foreground">{ROLE_LABELS[member.role]}{member.department ? ` · ${member.department}` : ""} · invited {new Date(member.invited_at).toLocaleDateString()}</p></div><div className="flex flex-wrap gap-2">{member.status === "invited" && <Button type="button" size="sm" variant="outline" onClick={() => onCopy(member)}><Copy className="h-3.5 w-3.5" />Copy link</Button>}{member.status !== "active" && <Button type="button" size="sm" variant="outline" onClick={() => onResend(member)}><RefreshCw className="h-3.5 w-3.5" />Renew link</Button>}{member.user_id && <Button type="button" size="sm" variant="outline" onClick={() => onRecovery(member.email)}><LockKeyhole className="h-3.5 w-3.5" />Reset password</Button>}{member.status === "active" && <Button type="button" size="sm" variant="outline" onClick={() => void onAction(member, "status", { status: "suspended" })}>Suspend</Button>}{(member.status === "suspended" || member.status === "deactivated") && member.user_id && <Button type="button" size="sm" variant="outline" onClick={() => void onAction(member, "status", { status: "active" })}>Reactivate</Button>}{member.status !== "deactivated" && <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(member); setEditRole(member.role as CompanyInviteRole); setEditDepartment(member.department ?? ""); setEditResponsibilities(Array.isArray(member.responsibilities) ? member.responsibilities.filter((item): item is string => typeof item === "string") : []); }}>Edit</Button>}{member.status !== "deactivated" && <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void onAction(member, "status", { status: "deactivated" })}>Deactivate</Button>}</div></div>{member.status === "invited" && new Date(member.expires_at).getTime() < Date.now() && <p className="mt-2 text-xs text-warning">Invitation expired. Renew it to create a new link.</p>}</article>)}{visibleRows.length === 0 && <div className="py-9 text-center text-sm text-muted-foreground">{allMembers.length ? "No team members match these filters." : "No team members yet."}</div>}</div>
    {editing && <div role="dialog" aria-modal="true" aria-labelledby="edit-member-title" className="fixed inset-0 z-[70] grid place-items-center bg-foreground/40 p-4"><form className="w-full max-w-lg space-y-4 rounded-xl bg-background p-5 shadow-elevated" onSubmit={(e) => { e.preventDefault(); void onAction(editing, "update", { role: editRole }); setEditing(null); }}><div className="flex items-center justify-between"><h2 id="edit-member-title" className="font-display text-lg font-semibold">Edit team member</h2><Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button></div><p className="text-sm text-muted-foreground">{editing.full_name} · {editing.email}</p><Field label="Role"><Select value={editRole} onValueChange={(value) => setEditRole(value as CompanyInviteRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manager">Manager</SelectItem><SelectItem value="dispatcher">Dispatcher</SelectItem><SelectItem value="driver">Driver</SelectItem></SelectContent></Select></Field><Field label="Department"><Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} /></Field><div className="flex flex-wrap gap-3">{responsibilityOptions.map((option) => <label key={option} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editResponsibilities.includes(option)} onChange={(e) => setEditResponsibilities(e.target.checked ? [...editResponsibilities, option] : editResponsibilities.filter((value) => value !== option))} />{option}</label>)}</div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit">Save team member</Button></div></form></div>}
  </div>;
}

function RolesPanel({ reviewed, onReview }: { reviewed: boolean; onReview: () => void }) {
  return <div><PanelHeader title="Roles & permissions" description="Access is enforced by company-scoped database rules. The role list below reflects the current fixed role system; custom permission editing is not configured." action={<Button variant={reviewed ? "outline" : "default"} onClick={onReview}>{reviewed ? <Check className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}{reviewed ? "Reviewed" : "Mark reviewed"}</Button>} />
    <div className="mb-4 flex flex-wrap gap-2">{(["fleet", "manager", "dispatcher", "driver", "client", "admin"] as AppRole[]).map((item) => <span key={item} className="rounded-full border border-border px-3 py-1.5 text-xs"><strong>{ROLE_LABELS[item]}</strong>{item === "fleet" ? " · company owner" : item === "admin" ? " · platform-level" : ""}</span>)}</div>
    <div className="overflow-x-auto"><table className="min-w-[720px] w-full border-collapse text-left text-xs"><thead><tr className="border-b border-border">{["Module", "Platform admin", "Company admin", "Manager", "Dispatcher", "Driver", "Client"].map((item) => <th key={item} className="px-2 py-3 font-semibold">{item}</th>)}</tr></thead><tbody>{ROLE_PERMISSION_ROWS.map((row) => <tr key={row.module} className="border-b border-border"><th className="px-2 py-3 font-semibold">{row.module}</th>{(["admin", "fleet", "manager", "dispatcher", "driver", "client"] as AppRole[]).map((item) => <td key={item} className="max-w-32 px-2 py-3 text-muted-foreground">{row.matrix[item]}</td>)}</tr>)}</tbody></table></div>
    <p className="mt-4 text-xs text-muted-foreground">Company invitations can assign Manager, Dispatcher, or Driver. Platform administrator access is never assignable by a company owner.</p>
  </div>;
}

function ChoiceList({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-2">{options.map((item) => <label key={item} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(item)} onChange={(event) => onChange(event.target.checked ? [...selected, item] : selected.filter((value) => value !== item))} />{item.replace(/_/g, " ")}</label>)}</div>;
}

function PreferenceToggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string }) {
  return <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border py-2"><div><div className="text-sm font-medium">{label}</div>{description && <div className="text-xs text-muted-foreground">{description}</div>}</div><Switch checked={checked} onCheckedChange={onChange} aria-label={label} /></div>;
}

function OperationsPanel({ record, onChange, onSave, saving }: { record: SettingsRecord; onChange: (path: string[], value: unknown) => void; onSave: () => void; saving: boolean }) {
  const order = nested(record, ["order"]); const fleet = nested(record, ["fleet"]); const drivers = nested(record, ["drivers"]); const delivery = nested(record, ["delivery"]);
  return <div><PanelHeader title="Operational settings" description="Set numbering, default pricing, compliance reminders, and delivery requirements for this company." />
    <div className="space-y-6">
      <div><h3 className="mb-3 font-display font-semibold">Orders</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Order numbering format"><Input value={String(order.number_format ?? "")} onChange={(e) => onChange(["order", "number_format"], e.target.value)} /></Field><Field label="Starting order number"><Input type="number" min="1" value={String(order.starting_number ?? 1)} onChange={(e) => onChange(["order", "starting_number"], Number(e.target.value))} /></Field><Field label="Default order status"><Select value={String(order.default_status ?? "pending")} onValueChange={(v) => onChange(["order", "default_status"], v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem></SelectContent></Select></Field><Field label="Default pricing method"><Select value={String(order.pricing_method ?? "per_km")} onValueChange={(v) => onChange(["order", "pricing_method"], v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="per_km">Per kilometre</SelectItem><SelectItem value="fixed">Fixed price</SelectItem><SelectItem value="quote">Manual quote</SelectItem></SelectContent></Select></Field><Field label="Default price per kilometre (KES)"><Input type="number" min="0" step="0.01" value={String(order.price_per_km ?? 0)} onChange={(e) => onChange(["order", "price_per_km"], Number(e.target.value))} /></Field><Field label="Estimated delivery buffer (minutes)"><Input type="number" min="0" value={String(order.delivery_buffer_minutes ?? 0)} onChange={(e) => onChange(["order", "delivery_buffer_minutes"], Number(e.target.value))} /></Field><Field label="Loading allowance (KES)"><Input type="number" min="0" value={String(order.loading_allowance ?? 0)} onChange={(e) => onChange(["order", "loading_allowance"], Number(e.target.value))} /></Field><Field label="Unloading allowance (KES)"><Input type="number" min="0" value={String(order.unloading_allowance ?? 0)} onChange={(e) => onChange(["order", "unloading_allowance"], Number(e.target.value))} /></Field></div><div className="mt-4"><div className="mb-2 text-sm font-semibold">Required order fields</div><ChoiceList options={OP_REQUIRED_FIELDS} selected={listValue(record, ["order", "required_fields"])} onChange={(v) => onChange(["order", "required_fields"], v)} /></div></div>
      <div><h3 className="mb-3 font-display font-semibold">Fleet & vehicles</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Vehicle numbering format"><Input value={String(fleet.number_format ?? "")} onChange={(e) => onChange(["fleet", "number_format"], e.target.value)} /></Field><Field label="Maintenance reminder (days)"><Input type="number" min="0" value={String(fleet.maintenance_reminder_days ?? 0)} onChange={(e) => onChange(["fleet", "maintenance_reminder_days"], Number(e.target.value))} /></Field></div><PreferenceToggle label="Require fuel records" checked={fleet.fuel_recording_required === true} onChange={(v) => onChange(["fleet", "fuel_recording_required"], v)} /></div>
      <div><h3 className="mb-3 font-display font-semibold">Drivers</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Driver numbering format"><Input value={String(drivers.number_format ?? "")} onChange={(e) => onChange(["drivers", "number_format"], e.target.value)} /></Field><Field label="Licence expiry warning (days)"><Input type="number" min="0" value={String(drivers.licence_warning_days ?? 0)} onChange={(e) => onChange(["drivers", "licence_warning_days"], Number(e.target.value))} /></Field></div><div className="mt-4"><div className="mb-2 text-sm font-semibold">Required driver documents</div><ChoiceList options={DRIVER_DOCS} selected={listValue(record, ["drivers", "required_documents"])} onChange={(v) => onChange(["drivers", "required_documents"], v)} /></div><div className="mt-4"><div className="mb-2 text-sm font-semibold">Availability statuses</div><ChoiceList options={DRIVER_STATUSES} selected={listValue(record, ["drivers", "availability_statuses"])} onChange={(v) => onChange(["drivers", "availability_statuses"], v)} /></div></div>
      <div><h3 className="mb-2 font-display font-semibold">Delivery proof</h3><PreferenceToggle label="Require proof of delivery" checked={delivery.proof_required === true} onChange={(v) => onChange(["delivery", "proof_required"], v)} /><PreferenceToggle label="Require delivery confirmation" checked={delivery.confirmation_required === true} onChange={(v) => onChange(["delivery", "confirmation_required"], v)} /><PreferenceToggle label="Require photo evidence" checked={delivery.photo_required === true} onChange={(v) => onChange(["delivery", "photo_required"], v)} /><PreferenceToggle label="Require signature" checked={delivery.signature_required === true} onChange={(v) => onChange(["delivery", "signature_required"], v)} /><Field label="Completion checklist" hint="Enter one item per line."><Textarea rows={4} value={Array.isArray(delivery.checklist) ? delivery.checklist.join("\n") : ""} onChange={(e) => onChange(["delivery", "checklist"], e.target.value.split("\n").map((v) => v.trim()).filter(Boolean))} placeholder="Confirm cargo is secured\nCapture delivery receipt" /></Field></div>
    </div><div className="mt-5 border-t border-border pt-4"><Button onClick={onSave} disabled={saving}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save operational settings</Button></div>
  </div>;
}

function FinancePanel({ record, onChange, onSave, saving }: { record: SettingsRecord; onChange: (path: string[], value: unknown) => void; onSave: () => void; saving: boolean }) {
  return <div><PanelHeader title="Finance settings" description="Company-level currency, invoice defaults, payment methods, and categories. Nothing here changes previously issued invoices." />
    <div className="space-y-5"><div className="grid gap-3 sm:grid-cols-2"><Field label="Default currency"><Select value={String(record.currency ?? COMPANY_DEFAULTS.currency)} onValueChange={(v) => onChange(["currency"], v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="KES">KES · Kenyan shilling</SelectItem><SelectItem value="USD">USD · US dollar</SelectItem><SelectItem value="UGX">UGX · Ugandan shilling</SelectItem><SelectItem value="TZS">TZS · Tanzanian shilling</SelectItem><SelectItem value="RWF">RWF · Rwandan franc</SelectItem></SelectContent></Select></Field><Field label="Invoice prefix"><Input value={String(record.invoice_prefix ?? "")} onChange={(e) => onChange(["invoice_prefix"], e.target.value)} /></Field><Field label="Invoice numbering format"><Input value={String(record.invoice_number_format ?? "")} onChange={(e) => onChange(["invoice_number_format"], e.target.value)} /></Field><Field label="Payment terms (days)"><Input type="number" min="0" value={String(record.payment_terms_days ?? 0)} onChange={(e) => onChange(["payment_terms_days"], Number(e.target.value))} /></Field><Field label="Default due date (days)"><Input type="number" min="0" value={String(record.default_due_days ?? 0)} onChange={(e) => onChange(["default_due_days"], Number(e.target.value))} /></Field></div>
      <div><PreferenceToggle label="Apply VAT to new invoices" checked={record.tax_enabled === true} onChange={(v) => onChange(["tax_enabled"], v)} /><Field label="VAT percentage" hint="Set the rate required for your business; 0 means no VAT rate has been configured."><Input type="number" min="0" max="100" step="0.01" value={String(record.vat_percentage ?? 0)} onChange={(e) => onChange(["vat_percentage"], Number(e.target.value))} /></Field></div>
      <div><h3 className="mb-2 font-display font-semibold">Payment methods</h3><ChoiceList options={PAYMENT_METHODS} selected={listValue(record, ["payment_methods"])} onChange={(v) => onChange(["payment_methods"], v)} /></div>
      <div><h3 className="mb-2 font-display font-semibold">Expense categories</h3><ChoiceList options={EXPENSE_CATEGORIES} selected={listValue(record, ["expense_categories"])} onChange={(v) => onChange(["expense_categories"], v)} /></div>
      <div><h3 className="mb-2 font-display font-semibold">Revenue categories</h3><ChoiceList options={REVENUE_CATEGORIES} selected={listValue(record, ["revenue_categories"])} onChange={(v) => onChange(["revenue_categories"], v)} /></div>
      <Field label="Default invoice notes"><Textarea rows={3} value={String(record.invoice_notes ?? "")} onChange={(e) => onChange(["invoice_notes"], e.target.value)} /></Field><Field label="Invoice footer"><Textarea rows={2} value={String(record.invoice_footer ?? "")} onChange={(e) => onChange(["invoice_footer"], e.target.value)} /></Field><Field label="Bank details"><Textarea rows={3} value={String(record.bank_details ?? "")} onChange={(e) => onChange(["bank_details"], e.target.value)} /></Field><Field label="M-Pesa details"><Textarea rows={3} value={String(record.mpesa_details ?? "")} onChange={(e) => onChange(["mpesa_details"], e.target.value)} /></Field>
    </div><div className="mt-5 border-t border-border pt-4"><Button onClick={onSave} disabled={saving}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save finance settings</Button></div>
  </div>;
}

function NotificationsPanel({ record, onChange, onSave, saving }: { record: SettingsRecord; onChange: (path: string[], value: unknown) => void; onSave: () => void; saving: boolean }) {
  return <div><PanelHeader title="Notifications" description="Choose which operational events should be shown through the available channels. SMS and WhatsApp are not connected." />
    <div className="mb-4 grid gap-3 sm:grid-cols-2"><div className="border-b border-border pb-3"><Bell className="h-4 w-4 text-primary" /><h3 className="mt-2 font-semibold">In-app notifications</h3><p className="mt-1 text-xs text-muted-foreground">Preferences are saved for this workspace.</p></div><div className="border-b border-border pb-3"><Mail className="h-4 w-4 text-primary" /><h3 className="mt-2 font-semibold">Email notifications</h3><p className="mt-1 text-xs text-muted-foreground">Email delivery is not configured. These choices will apply when available.</p></div></div>
    <div className="space-y-5">{EVENT_GROUPS.map((group) => <div key={group.title}><h3 className="mb-1 font-display font-semibold">{group.title}</h3>{group.events.map((event) => <div key={event.key} className="grid gap-2 sm:grid-cols-2"><PreferenceToggle label={event.label} checked={nested(record, ["in_app"])[event.key] !== false} onChange={(v) => onChange(["in_app", event.key], v)} /><PreferenceToggle label={`${event.label} · email`} checked={nested(record, ["email"])[event.key] === true} onChange={(v) => onChange(["email", event.key], v)} description="Available when an email sender is configured." /></div>)}</div>)}</div>
    <div className="mt-5 border-t border-border pt-4"><Button onClick={onSave} disabled={saving}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save notification settings</Button></div>
  </div>;
}

function SecurityPanel({ userEmail, securityStatus, onRecovery }: { userEmail: string | null; securityStatus: string; onRecovery: () => void }) {
  return <div><PanelHeader title="Security" description="Account security options currently supported by your LoadLink sign-in." />
    <div className="divide-y divide-border border-y border-border"><div className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-soft text-primary"><LockKeyhole className="h-4 w-4" /></span><div><div className="text-sm font-semibold">Password recovery</div><div className="text-xs text-muted-foreground">{userEmail ?? "No email address on this account"}</div></div></div><Button variant="outline" disabled={!userEmail} onClick={onRecovery}>Send recovery email</Button></div><div className="flex items-start gap-3 py-4"><ShieldCheck className="mt-1 h-4 w-4 text-primary" /><div><div className="text-sm font-semibold">Two-step verification</div><p className="mt-1 text-xs text-muted-foreground">{securityStatus}</p></div></div><div className="flex items-start gap-3 py-4"><Activity className="mt-1 h-4 w-4 text-primary" /><div><div className="text-sm font-semibold">Active sessions</div><p className="mt-1 text-xs text-muted-foreground">This sign-in session is active. Listing or revoking other devices is not available here.</p></div></div><div className="flex items-start gap-3 py-4"><FileKey2 className="mt-1 h-4 w-4 text-primary" /><div><div className="text-sm font-semibold">Login history</div><p className="mt-1 text-xs text-muted-foreground">Historical sign-in details are not available in the current account setup.</p></div></div><div className="flex items-start gap-3 py-4"><BadgeCheck className="mt-1 h-4 w-4 text-primary" /><div><div className="text-sm font-semibold">Account recovery email</div><p className="mt-1 text-xs text-muted-foreground">Recovery uses the verified email on your account. SMS and WhatsApp recovery are not configured.</p></div></div></div>
  </div>;
}

function IntegrationsPanel({ reviewed, onReview }: { reviewed: boolean; onReview: () => void }) {
  return <div><PanelHeader title="Integrations" description="Only live services used by this workspace are marked in use. No unsupported provider is represented as connected." action={<Button variant={reviewed ? "outline" : "default"} onClick={onReview}>{reviewed ? <Check className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}{reviewed ? "Reviewed" : "Mark reviewed"}</Button>} />
    <div className="divide-y divide-border border-y border-border">{INTEGRATIONS.map((item) => <article key={item.name} className="flex flex-wrap items-center gap-3 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-foreground"><item.icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.status === "In use" ? "status-success" : item.status === "Configuration required" ? "status-warning" : "bg-secondary text-muted-foreground"}`}>{item.status}</span></article>)}</div>
    <p className="mt-4 text-xs text-muted-foreground">Configuration controls will appear only when a supported provider setup is available.</p>
  </div>;
}

function AuditPanel({ rows, count, page, setPage, module, setModule, search, setSearch, from, setFrom, to, setTo }: {
  rows: AuditRow[]; count: number; page: number; setPage: (value: number) => void;
  module: string; setModule: (value: string) => void; search: string; setSearch: (value: string) => void;
  from: string; setFrom: (value: string) => void; to: string; setTo: (value: string) => void;
}) {
  return <div><PanelHeader title="Audit logs" description="Company activity is recorded automatically and cannot be edited or removed from this screen." />
    <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search descriptions" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={module} onValueChange={setModule}><SelectTrigger aria-label="Filter by module"><SelectValue /></SelectTrigger><SelectContent>{["all", "company", "settings", "team", "orders", "fleet", "drivers", "clients", "finance"].map((item) => <SelectItem key={item} value={item}>{item === "all" ? "All modules" : item}</SelectItem>)}</SelectContent></Select><Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} /><Input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
    <div className="flex items-center justify-between border-b border-border pb-2 text-xs text-muted-foreground"><span>{count.toLocaleString()} matching events</span><span>Page {page + 1}</span></div><div className="divide-y divide-border">{rows.map((row) => <article key={row.id} className="py-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold capitalize text-primary">{row.module}</span><span className="font-mono text-xs text-muted-foreground">{row.event_type}</span><time className="ml-auto text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</time></div><p className="mt-2 text-sm font-semibold">{row.description}</p>{row.record_id && <p className="mt-1 break-all text-xs text-muted-foreground">Record {row.record_id}</p>}</article>)}{rows.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No data available for this period.</div>}</div>
    <div className="flex justify-end gap-2 border-t border-border pt-3"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={(page + 1) * 25 >= count} onClick={() => setPage(page + 1)}>Next</Button></div>
  </div>;
}

function ExportsPanel({ onExport }: { onExport: (table: string, title: string) => void }) {
  const exportItems = [
    ["orders", "Orders", ClipboardList], ["trucks", "Vehicles", Map], ["drivers", "Drivers", Users],
    ["clients", "Clients", Building2], ["invoices", "Invoices", CircleDollarSign], ["payments", "Payments", CircleDollarSign], ["expenses", "Expenses", ArrowDownToLine],
  ] as const;
  return <div className="mt-8 border-t border-border pt-5"><PanelHeader title="Company data exports" description="Download company-owned records as CSV. Database access rules keep other companies’ records out of these exports." />
    <div className="divide-y divide-border border-y border-border">{exportItems.map(([table, label, Icon]) => <div key={table} className="flex items-center gap-3 py-3"><Icon className="h-4 w-4 text-primary" /><span className="flex-1 text-sm font-semibold">{label}</span><Button variant="outline" size="sm" onClick={() => void onExport(table, label)}><ArrowDownToLine className="h-3.5 w-3.5" />Download CSV</Button></div>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">Exports include up to 10,000 most recent records per category. Audit events are available in Audit Logs.</p>
  </div>;
}