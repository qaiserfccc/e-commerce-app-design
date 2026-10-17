# Next Agent Handoff

_Last updated: 2026-10-11_

This document is the operational handoff for continuing the ecommerce storefront + admin CRM project. It intentionally records environment-variable **names and sources**, never secret values.

## Project status

- Framework: Next.js 16 App Router, React 19, Tailwind CSS 4.
- Package manager: `pnpm@12.3.4`.
- Primary database: Neon Postgres.
- File storage: Vercel Blob.
- AI integration: Vercel AI Gateway is connected, but no AI feature is currently required by the storefront/admin data layer.
- Deployment target: Vercel. The project is already linked in `.vercel/`.
- Database migration history: `db/migrations/`.
- Drizzle schema mirror: `lib/db/schema.ts`.
- Drizzle connection: `lib/db/index.ts`.
- Data access: `app/actions/storefront.ts`, `app/actions/admin.ts`.
- Read endpoints: public catalog under `app/api/products/`; authenticated admin data under `app/api/admin/`.
- Client refresh hooks: `lib/hooks/use-storefront-data.ts`, `lib/hooks/use-admin-data.ts`.
- Sync notes: `docs/DATABASE_SYNC.md`.
- GitHub Actions: no workflow files are currently tracked in `.github/workflows/`.
- GitHub operation identity: project agents must verify and use `@qaiserfccc` for GitHub mutations; see `AGENTS.md`.
- The ISK Lenses storefront and admin screens use the shared Neon database. Product variants, published product details, image/video galleries, a protected public-catalog draft importer, and a full `/products` index are implemented. Imported product photos have been copied into Vercel Blob; public product responses and storefront image components serve only Blob URLs. The storefront has a multi-level source category browser and a sky/ice-blue palette. Migration `0006_store_product_categories.sql` is applied and schema validation passes.
- COD checkout and shopper sign-in/registration are implemented in the application: guests and account holders can submit inventory-checked orders, with no online payment. Order totals initially include product subtotal only; an admin must confirm delivery fees before dispatch. Shopper accounts do not verify email, provide password reset, or expose order history.
- Admin access now uses database-backed owner/admin/staff accounts, scrypt password hashes, and revocable signed sessions. Migration `0002_store_admin_users.sql` is applied to the connected Neon main branch, and an initial owner exists.
- Migrations `0003_isk_lens_catalog.sql`, `0004_isk_source_snapshot_import.sql`, and `0006_store_product_categories.sql` are applied to the connected Neon database and schema validation passes. The full replacement import was verified on 2026-10-10: 495 distinct products, 757 source-image links across 406 listings, 374 records with extracted table specifications, and no source video links. On the same date, the operator directed that all 495 products be published at a configured stock of 5 each. All are active; this operator-entered quantity is not verified physical stock. Migration 0006 seeds the 33 observed source categories and their parent relationships. All 757 available source-image references now have Vercel Blob assets across 406 products; all stored product-image and hero URLs are Blob-backed. Twelve initial network fetch failures succeeded on an idempotent retry. No video files were available in the imported source snapshot; no product videos were added. There are zero configured lens-option rows. Descriptions were not copied. Existing orders, order items, customers, and the one admin account were preserved.
- Migration `0005_cod_checkout_and_customer_accounts.sql` adds shopper credentials/session versions, COD and delivery-fee fields, order idempotency, and stock-reservation metadata. It is applied to the connected Neon database and schema validation passes; apply it separately to other target environments before enabling checkout there.

## Connected integrations

Verified through the project integration inventory:

1. **Neon** — connected and supplies the Postgres connection variables below.
2. **Blob** — connected and supplies `BLOB_READ_WRITE_TOKEN`.
3. **Vercel AI Gateway** — connected and available for future AI features.

Do not replace Neon with another database unless explicitly requested. Do not add a second database driver or use `@neondatabase/serverless`; this project uses `pg` + Drizzle.

## Environment variables

The variables are managed by the Vercel/v0 project environment and mirrored into the local development environment. Use the project Vars/integration settings to inspect or change values. Never commit `.env*`, tokens, passwords, or full connection strings.

### Required for current database, storage, and admin auth code

| Variable | Source | Usage |
|---|---|---|
| `DATABASE_URL` | Neon | Primary pooled Postgres connection used by `lib/db/index.ts`. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | Server-side Blob uploads/deletes/list operations. |
| `ADMIN_SESSION_SECRET` | Project environment | HMAC key for signed admin session cookies; set a cryptographically random value of at least 32 characters in each environment. |
| `CUSTOMER_SESSION_SECRET` | Project environment (optional) | Separate shopper-session HMAC source; if unset, the app derives a domain-separated shopper key from `ADMIN_SESSION_SECRET`. |

Admin access and shopper account/order signing fail closed until the required session secret and database migrations are configured. Credentials and roles are stored in `store_admin_users`; passwords are salted scrypt hashes. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are used only by the one-time local bootstrap script and are not read by the deployed application. Staff accounts are read-only; admins can change store data; owners can manage accounts. The owner-only System users panel can create admin/staff accounts and revoke their sessions. Public checkout/account throttles and the in-process admin login throttle are defense in depth, not distributed rate limits; configure edge-level rate limiting before production exposure.

The initial owner currently uses the provisional address `owner@localhost.invalid`; its generated password is stored in the ignored, mode-`600` `.env.local`. Sign in and update the owner email/password in **System users** before normal team use. Set local-only `ADMIN_LOGIN_PREFILL=true` in `.env.local` to prefill credentials and show a one-click **Quick sign in** button when using localhost in development; the production/preview sign-in never returns or displays the password. `ADMIN_SESSION_SECRET` is configured separately for local, Development, Preview, and Production.

### Neon-provided connection aliases

These are available from the Neon integration and may be useful for tooling or migrations. Prefer `DATABASE_URL` in application code unless a specific script needs another connection mode.

- `DATABASE_URL_UNPOOLED`
- `NEON_PROJECT_ID`
- `PGDATABASE`
- `PGHOST`
- `PGHOST_UNPOOLED`
- `PGPASSWORD`
- `PGUSER`
- `POSTGRES_DATABASE`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL_NO_SSL`
- `POSTGRES_USER`
- `NEON_AUTH_BASE_URL`
- `VITE_NEON_AUTH_URL`

The active Neon project identifier observed during schema work is `polished-dust-86909173`. Use the connected Neon tools/integration rather than hardcoding this identifier in runtime code.

### Available but unrelated to current data layer

- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` is present in the project environment inventory, but Supabase is not the active database/auth integration. Do not introduce Supabase code unless the architecture is explicitly changed.

### Not currently configured by this project

- `BETTER_AUTH_SECRET` is not present in the available environment inventory. Do not add Better Auth imports or auth routes until this secret is supplied and the Better Auth setup is intentionally approved.
- No custom `BETTER_AUTH_URL` is currently documented or required.

## Database and schema workflow

1. Make every schema change in a new numbered SQL file under `db/migrations/`.
2. Keep each migration replayable where practical (`IF NOT EXISTS`, guarded indexes/triggers).
3. Apply DDL to the connected Neon database through the Neon SQL tool, one SQL statement per call.
4. Refresh the live schema through the Neon integration after DDL changes.
5. Update `lib/db/schema.ts` to exactly mirror the live schema.
6. Run the repository validation script after schema changes.

The current schema includes products, product assets, source product categories, product variants, staged source-import runs/items, customers, orders, order items, activity events, and admin users. Migration `0003_isk_lens_catalog.sql` adds source provenance, image/video media typing, product variants, the PKR product-currency default, and updated-at triggers. Migration `0004_isk_source_snapshot_import.sql` adds structured source snapshots and bounded import staging. Migration `0006_store_product_categories.sql` adds the observed WooCommerce category hierarchy and an idempotency index for imported product assets.

## Data synchronization contract

- Storefront reads flow through SWR hooks to `/api/products`, then Drizzle/Neon.
- Admin metrics, products, orders, customers, and activity flow through session-protected `/api/admin/*` routes.
- Every admin server action checks the signed session independently. Mutations validate inputs and write audit events transactionally.
- Product image/video upload, reorder, and delete use authenticated Next.js route handlers and Vercel Blob; only Blob URLs and metadata are persisted.
- Public catalog/detail responses include active lens options, supported uploaded media, and source-category IDs. Product photography is exposed only as Vercel Blob URLs; source image URLs are not returned for storefront display. Other import provenance is admin-only.
- The public WooCommerce Store API importer is authenticated and stages all pages of 50 records before atomically replacing the product catalog. It retains structured fields, extracted table specifications, pricing, categories, availability, and image/video URL references; it excludes descriptive copy and does not download/rehost media. After an import, `node --env-file=.env.local scripts/rehost-source-product-images.mjs` copies approved ISK upload images into Blob; it is bounded, retries transient failures, and is safe to rerun. The source snapshot contained no video links. Each new import creates drafts with zero stock. The current catalog was separately published at the operator's direction; verify listing details and source media rights before relying on or adding claims.
- After a successful admin mutation, call the relevant SWR `mutate()`/refresh function for immediate UI consistency.
- Current UI synchronization is polling/revalidation, not database WebSockets. Treat “realtime” as sync-ready periodic refresh unless a future agent adds an approved realtime transport.
- Admin access is a database-backed owner/admin/staff system with scrypt-hashed passwords and revocable signed sessions; it is not SSO.
- The storefront bag is in-page state only. Customer/order creation and order-history reads are intentionally unavailable until payment, checkout, and customer-access controls are configured.

## Deployment reference

- Vercel project is already linked locally via `.vercel/`.
- Use the Vercel project UI for normal preview/production publishing.
- If CLI deployment is explicitly needed, run commands from `/vercel/share/v0-project` with the project’s authenticated Vercel CLI context; use `pnpm` for package commands.
- Do not deploy from or commit the `.env` files.
- Before deployment, verify the Vercel project has the Neon and Blob integrations attached for the target environment (Development, Preview, and Production as appropriate).
- After deployment, verify `/`, `/api/products`, and `/api/admin/metrics` in the deployed environment and inspect Vercel logs if a runtime database/storage error appears.

## Validation checklist

From the repository root:

```bash
pnpm exec tsc --noEmit
node scripts/validate-build.mjs
node --env-file=.env.local scripts/validate-schema.mjs
pnpm build
```

Schema validation requires `DATABASE_URL` and access to the configured Neon database. The canonical production check remains `pnpm build`.

Also inspect:

- `git diff -- db/migrations lib/db app/actions app/api lib/hooks docs`
- live Neon schema through the integration tool when available
- Vercel deployment/build logs after publishing

## Safe handoff rules

- Never print or commit secret environment values.
- Never use localStorage as the source of truth for products, orders, customers, or admin metrics.
- Never hardcode product/catalog records in the storefront once database-backed records are available.
- Preserve migration history; add a new migration instead of rewriting an applied migration.
- Keep SQL in `db/migrations/` and application queries in Drizzle modules.
- If a required integration variable appears missing, refresh the integration inventory once before concluding it is unavailable.

## Repository snapshot and agent memory

_Verified in the repository on 2026-10-10._

- The implementation is Next.js App Router with React 19, TypeScript, Tailwind CSS 4, and `pnpm`; data routes and server actions run inside Next.js. There is no Express service in this codebase. Preserve this architecture unless a framework migration is explicitly approved.
- The approved customer-facing brand is **ISK Lenses**, replacing the previous lifestyle-goods direction. Keep product statements factual and do not invent medical or performance claims.
- The current GitHub-operation policy is to verify `gh api user --jq .login` and operate only as `qaiserfccc`. A check on 2026-10-10 returned `qaiserfcc`, so no GitHub operations were performed in that session; do not switch identities to work around the mismatch. GitHub Actions are enabled in repository settings, but there are no checked-in workflows or recorded workflow runs. The repository allows all actions. One other collaborator, `qaiserfcc`, was previously observed with write access. Repository instructions do not enforce account exclusivity for other repository users; enforce it through GitHub access controls if repository-wide exclusivity is required. Attempts to lower the collaborator's role via the collaborator permission API were rejected, and access was not otherwise changed.
- The storefront reads active products through `app/api/products/route.ts` and `lib/hooks/use-storefront-data.ts`. The admin overview reads metrics through `app/api/admin/metrics/route.ts` and `lib/hooks/use-admin-data.ts`.
- Admin sign-in uses database-backed identities and a signed HTTP-only cookie. Product/order/customer reads, admin mutations, and image endpoints verify the session on the server.
- Admin sign-in uses database-backed owner/admin/staff accounts and signed HTTP-only cookies; owner-only user management is available in the workspace. The admin migration and initial owner have been provisioned in Neon.
- Product, order, customer, and analytics screens are connected to authenticated database routes; mutations validate inputs and log metadata-only audit events.
- Product image/video upload, preview, reorder, and deletion are wired to Vercel Blob and `store_product_assets`. Lens-option management is database-backed. COD order creation uses an idempotency key and transactional stock reservation; cancellation restores reserved inventory. Admins confirm delivery fees before shipping and mark payment received after delivery. There is no online payment, email verification, password reset, customer order history, configured tax calculation, or automatic delivery-fee notification.
- `components/admin/project-kanban.tsx` is a read-only snapshot of requirements versus repository status. Its task definitions are code-level project context, not order/customer records or persistent task data. It deliberately does not mutate business data.

## Next recommended work

1. Replace the provisional owner credentials in **System users** before normal team use; apply edge-level sign-in rate limiting before production exposure.
2. Review the published listings and verify lens specifications, prices, imagery, claims, media rights, and configured stock; the operator-entered quantity of 5 does not attest to physical inventory. All available source photos were copied to Blob, but the 89 uncategorized products have no source categories and some listings have no photo references.
3. Apply migration `0005_cod_checkout_and_customer_accounts.sql` to any target database other than the connected Neon database and validate its schema. Confirm the delivery-fee/customer-contact procedure and configure edge-level rate limiting before production exposure.
4. Manage repository collaborator access in GitHub settings if repository-wide operator exclusivity is required.
5. If GitHub Actions workflows are introduced, gate every job to `github.actor == 'qaiserfccc' && github.triggering_actor == 'qaiserfccc'`.
6. Keep this file updated whenever integrations, environment variables, deployment settings, migrations, or verified project status change.

## Quick file map

```text
db/migrations/0001_storefront_workspace.sql
db/migrations/0005_cod_checkout_and_customer_accounts.sql
lib/db/schema.ts
lib/db/index.ts
app/actions/storefront.ts
app/actions/checkout.ts
app/actions/admin.ts
app/api/orders/route.ts
app/api/products/route.ts
app/api/admin/
app/checkout/
lib/hooks/use-storefront-data.ts
lib/hooks/use-admin-data.ts
docs/DATABASE_SYNC.md
docs/NEXT_AGENT_HANDOFF.md
```

This file is a reference, not a secret store. The authoritative environment values remain in the connected Vercel project integrations and Vars settings.

## Eyelenses.pk-style redesign (branch `qaiserfccc-eyelenses-pk-redesign`)

- Storefront routes live in `app/(store)/`: `/`, `/shop`, `/product-category/[...path]`, `/product/[slug]`, `/cart`, `/checkout`, `/checkout/confirmation`, `/my-account`, `/faq`, `/contact-us`, `/blogs`, `/shipping-returns`, `/privacy-policy`, `/terms-conditions`. `/products*` redirects to `/shop` and `/product/*`.
- Admin moved to `/admin` (`components/admin/admin-shell.tsx` wraps `AdminWorkspace`, themed via `.admin-theme` in `globals.css`).
- Shell: `components/storefront/shell/` (announcement bar, header, mega-menu, mini-cart, footer). Palette navy `#033473`, font Outfit. Legacy checkout/product-detail are re-themed through `.storefront-sky` colour remaps.
- Optional env vars (names only): `NEXT_PUBLIC_STORE_PHONE`, `NEXT_PUBLIC_STORE_EMAIL`, `NEXT_PUBLIC_STORE_WHATSAPP`, `NEXT_PUBLIC_STORE_INSTAGRAM_URL`, `NEXT_PUBLIC_STORE_FACEBOOK_URL`.
- Static/policy pages are neutral drafts; blogs has no posts. Have the owner review legal text, return terms, and contact details before launch.
- `DESIGN.md` still describes the earlier design and needs a rewrite for this system.

## Roles, cache and DB-driven storefront

- Roles: admin side (`owner > admin > staff`, `lib/auth/admin.ts`), buyer (customer account, `lib/auth/store-customer.ts`, `/my-account` incl. "My orders" via `/api/storefront/orders`), and guest COD checkout.
- Migration `db/migrations/0007_storefront_content.sql` adds `store_banners`, `store_reviews`, `store_settings` (seeded from the former dummy homepage data). **Must be applied to Neon** before the home page, header and footer show content.
- Home, header and footer are loaded from the DB via `lib/data/site-content.ts`; the catalog via `lib/data/catalog.ts`. Admin edits them under "Storefront content" (`app/actions/content.ts`, upload to Vercel Blob at `/api/admin/content/upload`).
- Cache (`lib/cache.ts`): Redis REST when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL`/`KV_REST_API_TOKEN`) are set, else per-process memory. Namespaces `catalog` (300s/600s) and `content` (300s); invalidated on admin/checkout writes.
- Seeded image URLs still point at eyelenses.pk until re-uploaded to Blob by an admin.

### Applied to Neon (main branch, only branch)
Migration 0007 applied and schema validated. `scripts/mirror-content-images.mjs` mirrored all seeded banner/footer-logo images into Vercel Blob and rewrote DB URLs (re-runnable; needs `DATABASE_URL` + `BLOB_READ_WRITE_TOKEN`). Product images were already on Blob.
