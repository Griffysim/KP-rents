# KP-Rents Neon Migration Plan

## Objective

Replace the insecure legacy browser application with a Neon-backed property-management application that has real user authentication and a landlord-led tenant invitation flow. The migration intentionally starts with an empty production data model; no legacy test data will be copied.

## Architecture

- **Frontend:** React, TypeScript, and Vite. The browser holds no database credential and never talks directly to PostgreSQL.
- **Authentication:** Neon Managed Better Auth (`auth: true`) with email/password and verified-email flows. Landlords can register their own account. Tenants only gain app access by accepting an invitation issued by their landlord.
- **Tenant invitations:** Neon Auth Organizations provide the invitation email and membership acceptance. KP-Rents stores the tenant's property, contact, rent, and invitation status in public application tables. The tenant creates their password, verifies the email address, accepts the invitation, and then claims the matching tenant record.
- **Application API:** A Neon Function uses Hono, `pg`, parameterized SQL, Zod validation, and JWT verification against Neon Auth's injected JWKS. Every request is scoped to the authenticated landlord organization or the authenticated tenant's own record.
- **Database:** Normalized PostgreSQL tables in the `public` schema for landlord profiles, properties, tenants, utility rates/readings, payments, invoices, messages, expense categories, and expenses. Foreign keys, check constraints, and tenant/landlord-scoped indexes enforce data integrity.
- **Mobile packaging:** Capacitor wraps the same Vite build, so the verified web app can be synced into an Android project and assembled as an installable APK after the backend deployment is functional.

## Security Decisions

1. Remove the legacy browser database client, hard-coded privileged key, hard-coded landlord password, and plaintext tenant passwords.
2. Use short-lived Neon Auth JWTs for API calls. The Neon Function validates them using `NEON_AUTH_JWKS_URL`; the PostgreSQL connection string stays server-side.
3. Keep landlord-only mutations (properties, tenants, payments, invoices, utility rates, expenses, settings, issue resolution) on protected API routes.
4. Restrict tenant routes to the tenant's own lease, readings, invoices, and messages. Tenant email and property identity are verified server-side during the claim flow.
5. Email verification and organization-invitation emailing are enabled in Neon Auth before production use. A trusted production frontend origin and production SMTP configuration remain environment-specific deployment inputs.

## Frontend Design

- **Design movement:** Calm, professional utility software for small property portfolios.
- **Core principles:** clear role separation, task-first dashboards, visible invitation status, and mobile-safe forms.
- **Color philosophy:** retain the existing indigo/purple accent as a familiar KP-Rents brand cue, with restrained neutral panels and high-contrast status colours.
- **Layout paradigm:** a compact role-aware application shell with a persistent summary header and action-led content panels instead of an overloaded single static page.
- **Signature elements:** rent-status summary cards, invitation/status pills, and drawer-style forms that work at narrow widths.
- **Interaction philosophy:** every mutation shows an explicit success/failure state; loading and empty states explain the next useful action.
- **Animation:** short opacity and transform transitions only for panel entry, alerts, and modal states; no decorative motion.
- **Typography:** system UI stack with clear numeric/tabular treatment for money, dates, and meter values.
- **Brand essence:** *KP-Rents gives independent landlords one secure place to manage property, tenants, and rent operations.* Personality: dependable, clear, approachable.
- **Brand voice:** direct and practical, for example: “Invite a tenant securely” and “Your property portfolio is up to date.”

## Project Structure

```text
KP-rents/
├── src/                    # React application, auth client, typed API client, UI and styles
├── functions/              # Neon Function API, JWT checks, validation and parameterized SQL
├── db/                     # Versioned PostgreSQL migration and schema documentation
├── public/                 # Static assets and installable-web-app metadata
├── tests/                  # Pure unit tests for validation and financial helpers
├── neon.ts                 # Neon Auth and Neon Function declaration
├── capacitor.config.ts     # Android wrapper configuration
└── .env.example            # Public runtime configuration names only, never secrets
```

## Delivery Boundaries

The production schema will be prepared and tested on an isolated Neon branch before it is applied to the production branch. Applying that schema requires a final confirmation because it changes the live database. The native invitation emails require Neon Auth email verification and a configured email provider; shared Neon email is appropriate for development tests, while a production SMTP provider and the final hosted frontend origin must be supplied/configured before launch.
