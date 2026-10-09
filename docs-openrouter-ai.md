# KP-Rents OpenRouter AI assistant

KP-Rents keeps all financial records deterministic. Rent totals, meter calculations, payments, invoices, and reports are calculated by the protected Neon Function and PostgreSQL. The optional AI assistant only drafts a tenant-facing invoice cover note and explains aggregated report figures in plain language.

## Secure setup

1. In OpenRouter, create a dedicated **KP-Rents** API key with a fixed credit limit. Do not use an unlimited personal key.
2. Add the key to the deployed Neon Function as `OPENROUTER_API_KEY`.
3. Optionally set `OPENROUTER_MODEL` as the initial default model. This is not required once a landlord selects a model in KP-Rents Settings.
4. Redeploy the `kprentsapi` Neon Function.
5. Sign in as a landlord, open **Settings → AI assistant**, and choose a text model from the live OpenRouter list.

> Never place `OPENROUTER_API_KEY` in Vite environment variables, the Android APK, browser local storage, source control, or a tenant-facing form.

## Data sent to OpenRouter

- **AI cover note:** the tenant name, property name, billing period, due date, and already-calculated invoice total. The original invoice remains unchanged.
- **AI report:** aggregated counts and financial totals only. It excludes tenant email addresses, phone numbers, bank details, and message contents.

## Failure behavior

If no app key is configured, deterministic invoices and financial reports continue to work. AI actions show a configuration message instead of failing the page.

## References

- [OpenRouter quickstart](https://openrouter.ai/docs/quickstart)
- [OpenRouter API authentication](https://openrouter.ai/docs/api_reference/authentication)
- [OpenRouter models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)
