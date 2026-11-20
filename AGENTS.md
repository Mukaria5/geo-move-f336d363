# Architecture decisions

- Use `fleet_companies.user_id` as the canonical company tenant key; company membership maps staff to that owner so existing owner-scoped modules remain reusable.
- Keep platform roles in the existing `user_roles` table; only a verified, matching invitation may provision company staff roles, preventing self-elevation.
- Store company preferences and branding in the existing company profile plus one JSON settings row; record auditable actions through append-only, database-generated events.
- Keep privileged invitation acceptance in database security-definer triggers tied to verified auth email; never depend on the unavailable service-role secret for normal team flows.
