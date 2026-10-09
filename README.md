# KP-Rents

KP-Rents is a secure property-management app for independent landlords. It uses **Neon Postgres**, **Neon Managed Better Auth**, and a protected **Neon Function** rather than exposing a database credential in the browser.

## What is included

| Area | Implementation |
| --- | --- |
| Landlord access | Email/password sign-up through Neon Auth; the first successful sign-up creates a private landlord organization. |
| Tenant access | A landlord creates a tenant record and sends a Neon Auth organization invitation. The tenant creates their own password, verifies their email, accepts the invitation, and only then can access their tenant portal. |
| Data API | `functions/api.ts` verifies short-lived Neon Auth JWTs against the injected JWKS before running parameterized PostgreSQL queries. |
| Portfolio data | Properties, tenant records, payments, utility rates/readings, invoices, messages, expense categories, and expenses are defined in `db/0001_kp_rents_initial.sql`. |
| Android path | Capacitor serves the bundled Vite build through the trusted production web hostname, so tenant invitation emails route to the public app instead of an unreachable device-local address. |

## Security model

The browser contains no PostgreSQL connection string and no privileged API key. The function verifies the `Authorization: Bearer` token issued by Neon Auth, derives the landlord or tenant identity from the database, and scopes every operation to that actor. Landlords can manage only their own organization’s records; tenants can view only their own property, invoices, readings, and messages.

The tenant workflow intentionally has no shared, default, or plaintext password. A tenant cannot receive access by selecting a role on the sign-up screen; the claim route requires both the invitation email and accepted Neon organization membership.

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Both public service URLs are supplied in `.env.example`, including the deployed production Function URL. These values are public URLs, not secrets. Override `VITE_KP_RENTS_API_URL` only when using a separate Neon branch or Function deployment.

## Neon deployment checklist

1. Log into the Neon CLI and link this repository to project `plain-glitter-66551809`, production branch.
2. Apply `db/0001_kp_rents_initial.sql` through the reviewed Neon migration workflow.
3. Ensure `neon.ts` contains `auth: true`, then run `neon deploy`. This deploys the `kprentsapi` function and injects the database and Auth verification environment variables into it.
4. Copy the deployed function’s public URL into `VITE_KP_RENTS_API_URL` only when deploying a separate branch or Function. The production fallback is already included in the app configuration.
5. In Neon Auth, enable email/password authentication with **required email verification**. Enable the Organization plugin invitation email option.
6. Add the exact production web frontend origin as a Neon Auth trusted domain. The Android Capacitor runtime uses this canonical hostname for its bundled app assets so invitation links resolve to the public invitation route.
7. For production delivery, configure a verified custom email provider in Neon Auth and send a test invitation before inviting real tenants.
8. Set the function’s `ALLOWED_ORIGINS` environment variable to the final frontend origin (and any intentional preview origin) after the host domain is known.

> The first steps to production alter live configuration and schema. The repository includes the migration but does not apply it automatically.

## Android APK

Capacitor packages the tested Vite build as an Android project:

```bash
pnpm android:sync
pnpm android:apk:debug
```

The debug APK is created at `android/app/build/outputs/apk/debug/app-debug.apk`. An Android SDK is required for `cap add android`, sync, and assembly. The debug APK is installable for testing; create and protect a user-owned release signing key before Play Store or broad-distribution release builds.

## Project layout

```text
src/          React, TypeScript, Neon Auth browser client, and dashboard UI
functions/    JWT-protected Neon Function API
db/           versioned Neon Postgres migration
public/       installable-web-app manifest
neon.ts       Neon Auth and Function deployment configuration
capacitor.config.ts  Android wrapper configuration
```

## Validation

```bash
pnpm typecheck
pnpm build
```

Both commands must pass before deployment. See [docs-neon-implementation.md](./docs-neon-implementation.md) for the deployment-specific Neon references and current project identifiers.
