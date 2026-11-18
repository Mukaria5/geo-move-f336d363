# Phase 9 — Company Settings & Administration

## Goal
Deliver a usable, mobile-first administration center in the existing LoadLink design, with real persistence and company-scoped access. Reuse `fleet_companies`, `user_roles`, existing auth, modules, and navigation; do not replace existing operations or finance workflows.

## Build
1. Extend the existing company profile with the requested organization and brand fields, and add a company-owned settings record for operational, finance, and notification preferences. Keep the requested Kenya defaults and current Emerald Prestige appearance.
2. Add company membership/invitation records and immutable audit events. Secure changes behind authenticated, company-admin authorization; keep the existing `admin` platform role distinct from company administrators and use the existing role system rather than a parallel permission framework.
3. Implement a settings center with Overview, Company Profile, Users & Team, Roles & Permissions, Operational Settings, Finance Settings, Notifications, Security, Integrations, and Audit Logs. Persist supported settings; identify unsupported account/session controls and unconfigured integrations honestly. Add searchable/filterable member and audit views, actual setup checklist, and company-scoped CSV exports.
4. Connect the center to More and the company dashboard with role-aware links. Preserve existing routes and bottom navigation.
5. Validate the saved profile/settings, authorized and unauthorized access, tenant isolation, invitation/audit behavior where supported, navigation, responsive layouts, and current build signals.

## Technical approach
- Use additive Lovable Cloud migrations, explicit grants and RLS, and the current `fleet_companies.user_id` as the company owner/tenant key. Keep company settings and events isolated by that key.
- Use authenticated TanStack server functions for privileged invitation/role actions; verify the caller's company-admin role before loading the admin client. Ordinary reads/writes stay subject to RLS.
- Record all settings changes and administrative events in append-only audit data. Never claim email, SMS, WhatsApp, GPS, or other external integrations are connected without verified configuration.
- Preserve the existing role enum and treat `fleet` as company administration and `admin` as platform administration unless the existing app establishes otherwise.
