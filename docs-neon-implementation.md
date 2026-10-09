# Neon implementation references

The implementation uses Neon Managed Better Auth and a Neon Function API. These source references informed the migration:

- [Neon Auth React quickstart](https://neon.com/docs/auth/quick-start/react.md): configure `createAuthClient()`, use `signUp.email()`, `signIn.email()`, `getSession()`, and `signOut()` in the browser.
- [Neon Organizations plugin](https://neon.com/docs/auth/guides/plugins/organization.md): native organization invitations support an owner/admin inviting a member; invitation email requires verification at sign-up and an accept-invitation route.
- [Neon email verification](https://neon.com/docs/auth/guides/email-verification.md): verification OTP works with Neon shared development email; production should use verified email and an appropriate production provider.
- [Neon Auth production checklist](https://neon.com/docs/auth/production-checklist.md): configure trusted frontend domain(s), production email provider, application name, and disable localhost access before launch.
- [Neon Functions authentication](https://neon.com/docs/compute/functions/authentication.md): the browser calls `authClient.token()` and the Neon Function verifies the short-lived JWT with `jose` against `NEON_AUTH_JWKS_URL`; direct browser calls require CORS handling.
- [neon.ts reference](https://neon.com/docs/reference/neon-ts.md): `auth: true` provisions Managed Better Auth; a `functions` entry lets `neon deploy` deploy the function and injects `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_JWKS_URL` at runtime.

Current selected Neon resources:

- Project: `plain-glitter-66551809` (`kp-rents2`), Frankfurt region.
- Production branch: `br-wandering-lab-b2e1soj8`.
- Database: `neondb`.
- Managed Better Auth is already provisioned on this branch. Its public base URL is declared in `.env.example`; its current trusted-origin list is empty, and email/password verification is not yet required.

Deployment must configure the final public frontend origin as a trusted Neon Auth domain. It must also enable required email verification and organization invitation email before tenants are invited.
