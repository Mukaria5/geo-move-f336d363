import {
  Activity, Bell, Building2, CircleDollarSign, ClipboardList, LockKeyhole, Plug, ShieldCheck, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/auth-context";

export const COMPANY_DEFAULTS = {
  country: "Kenya",
  currency: "KES",
  timezone: "Africa/Nairobi",
  preferredLanguage: "en",
  dateFormat: "dd/MM/yyyy",
} as const;

export const COMPANY_INVITABLE_ROLES = ["manager", "dispatcher", "driver"] as const;
export type CompanyInviteRole = (typeof COMPANY_INVITABLE_ROLES)[number];

export function isCompanyInviteRole(role: string): role is CompanyInviteRole {
  return COMPANY_INVITABLE_ROLES.some((candidate) => candidate === role);
}

export type SettingsSectionKey =
  | "company"
  | "team"
  | "roles"
  | "operations"
  | "finance"
  | "notifications"
  | "security"
  | "integrations"
  | "audit";

export type SettingsSection = {
  key: SettingsSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const COMPANY_SETTINGS_SECTIONS: SettingsSection[] = [
  { key: "company", label: "Company profile", description: "Business details and branding", icon: Building2 },
  { key: "team", label: "Users & team", description: "Invitations and staff access", icon: Users },
  { key: "roles", label: "Roles & permissions", description: "Current access by role", icon: ShieldCheck },
  { key: "operations", label: "Operational settings", description: "Orders, fleet and delivery defaults", icon: ClipboardList },
  { key: "finance", label: "Finance settings", description: "Invoices, taxes and payments", icon: CircleDollarSign },
  { key: "notifications", label: "Notifications", description: "In-app and email preferences", icon: Bell },
  { key: "security", label: "Security", description: "Password, sessions and recovery", icon: LockKeyhole },
  { key: "integrations", label: "Integrations", description: "Connected services and availability", icon: Plug },
  { key: "audit", label: "Audit logs", description: "Company activity history", icon: Activity },
];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Platform admin",
  fleet: "Company admin",
  manager: "Manager",
  dispatcher: "Dispatcher",
  driver: "Driver",
  client: "Client",
};

export type SettingsRecord = Record<string, unknown>;

export type CompanySettingsDraft = {
  operational_settings: SettingsRecord;
  finance_settings: SettingsRecord;
  notification_settings: SettingsRecord;
  administration_settings: SettingsRecord;
};

export function defaultCompanySettings(): CompanySettingsDraft {
  return {
    operational_settings: {
      order: {
        number_format: "ORD-{YYYY}-{0000}", starting_number: 1, default_status: "pending",
        required_fields: ["pickup_address", "dropoff_address", "cargo_name"], pricing_method: "per_km",
        price_per_km: 0, loading_allowance: 0, unloading_allowance: 0, delivery_buffer_minutes: 60,
      },
      fleet: { number_format: "TRK-{0000}", maintenance_reminder_days: 30, fuel_recording_required: false },
      drivers: { number_format: "DRV-{0000}", licence_warning_days: 30, required_documents: ["driving_license"], availability_statuses: ["available", "assigned", "driving", "off_duty"] },
      delivery: { proof_required: true, confirmation_required: true, photo_required: false, signature_required: false, checklist: [] },
    },
    finance_settings: {
      currency: COMPANY_DEFAULTS.currency, tax_enabled: false, vat_percentage: 0,
      invoice_number_format: "INV-{YYYY}-{0000}", invoice_prefix: "INV", payment_terms_days: 30, default_due_days: 30,
      payment_methods: ["cash", "bank_transfer", "mobile_money", "cheque", "other"],
      expense_categories: ["fuel", "maintenance", "driver_allowance", "tolls", "repairs", "insurance", "licences", "other"],
      revenue_categories: ["transport", "loading", "offloading", "fuel_surcharge", "other"],
      invoice_notes: "", invoice_footer: "", bank_details: "", mpesa_details: "",
    },
    notification_settings: {
      in_app: {
        new_order: true, order_assigned: true, order_delayed: true, order_completed: true, order_cancelled: true,
        maintenance_due: true, insurance_expiry: true, inspection_expiry: true, vehicle_unavailable: true,
        licence_expiry: true, driver_unavailable: true, driver_suspended: true,
        invoice_created: true, payment_received: true, invoice_overdue: true, expense_submitted: true,
        user_invitation: true, user_changes: true, security_alerts: true,
      },
      email: {},
    },
    administration_settings: { roles_reviewed: false, integrations_reviewed: false },
  };
}

export function mergeSettingsRecord(base: SettingsRecord, saved: unknown): SettingsRecord {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return { ...base };
  const source = saved as SettingsRecord;
  const result: SettingsRecord = { ...base };
  for (const [key, value] of Object.entries(source)) {
    const existing = base[key];
    result[key] = existing && typeof existing === "object" && !Array.isArray(existing)
      ? mergeSettingsRecord(existing as SettingsRecord, value)
      : value;
  }
  return result;
}