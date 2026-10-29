# CRM and Meta Lead Ads

The admin workspace's **CRM** area is a customer-lead pipeline, not a messaging inbox. It supports manually entered leads and Meta Facebook/Instagram Lead Ads. Messenger, Instagram DMs, and WhatsApp are separate integrations and are not enabled here.

## Database and deployment

1. `db/migrations/0017_crm_meta_leads.sql` is applied to the currently connected Neon database and its table/trigger have been validated. Apply it to any other target database before deploying CRM there; the statements are replay-safe.
2. Run `node --env-file=.env.local scripts/validate-schema.mjs` in an environment configured for that database.
3. Configure the following server-only environment variables in the deployment and local `.env.local` as needed. Do not prefix them with `NEXT_PUBLIC_` and never commit their values. Vercel's **Settings → Environment Variables** page for `e-commerce-app-design` is where production/preview values are managed; redeploy after changing them. Vercel currently has inert `REPLACE_ME_...` placeholders in both Production and Preview. They deliberately do not activate Meta ingestion; replace them with real values only after the Meta Page/app are ready.

| Variable | Purpose |
| --- | --- |
| `META_APP_SECRET` | Meta app secret used to validate the exact webhook request bytes with `X-Hub-Signature-256`. |
| `META_WEBHOOK_VERIFY_TOKEN` | Private random string entered as the webhook's verification token in Meta's app dashboard. |
| `META_PAGE_ACCESS_TOKEN` | Server-side page token used to fetch submitted lead fields from the Graph API. Keep it private and rotate it if exposed. |
| `META_PAGE_ID` | Numeric ID of the one page this endpoint accepts events for. |
| `META_GRAPH_API_VERSION` | Explicit Graph API version, in `vNN.N` format, supported by the Meta app. Choose and maintain this from Meta's current Graph API version schedule; the app intentionally does not guess or silently pin a version. |

Meta setup must grant the app the page access and lead-retrieval permissions required by Meta for the selected page. In the Meta app dashboard, configure a **Page** webhook subscription for the `leadgen` field and set the callback URL to:

```text
https://<your-deployment-host>/api/webhooks/meta-leads
```

Use the same `META_WEBHOOK_VERIFY_TOKEN` value for Meta's verify-token prompt. Meta's GET verification challenge is answered only for the `subscribe` mode and matching token. POST payloads are accepted only when the raw body has a valid HMAC-SHA256 `X-Hub-Signature-256`, uses JSON, is at most 256 KiB, and references the configured page. The lead ID is then fetched from the Graph API using the server-side page token. Duplicate Meta lead IDs are idempotently ignored.

If any required setting is absent or the Graph version is malformed, the admin CRM shows the missing variable names and Meta ingestion returns an explicit unavailable response. The CRM and manual lead path remain usable.

Values starting with `REPLACE_ME`, `YOUR_`, `CHANGE_ME`, or `PLACEHOLDER` are treated as missing by the application. These may be used as inert Vercel placeholders while waiting for Meta app access, but do not enable ingestion and should be replaced with real Meta settings before launch.

## Data handling

- The admin CRM API and server actions require a signed-in admin session. Staff can view leads; only admins and owners can add leads, move pipeline status, or edit notes and follow-up dates.
- Only name, email, phone, and Meta page/form/ad/campaign/lead identifiers are stored. Unknown/custom answers and the raw webhook or Graph API payload are not persisted or sent to the browser.
- Lead emails are matched to existing store customers case-insensitively. A match links the CRM record to the customer and reports their order count; no customer password/session data or order address is exposed through CRM.
- Activity events record the action and changed field names, not lead PII. Webhook failures log only a generic event and error class; response bodies, tokens, signatures, and contact data are not logged.

The webhook returns non-2xx errors for invalid signatures, unsupported events, configuration errors, Meta fetch failures, and database failures. Meta can retry transient failures; successfully imported leads remain idempotent on retry.

## Manual verification

1. Sign in as an admin or owner and open `/admin/crm`.
2. Add a manual lead and confirm the record appears, is searchable, and supports status, notes, and follow-up edits.
3. Configure the variables above, complete Meta's webhook verification, and send a Meta test lead. Confirm the contact and available attribution identifiers are shown.
4. Replay the same signed event and confirm it is counted as a duplicate rather than creating another CRM record.
5. Confirm an invalid signature receives `401`, the wrong page receives `403`, and missing server configuration receives `503`.
