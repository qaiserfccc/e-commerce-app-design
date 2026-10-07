# Next Agent Handoff

_Last updated: 2026-10-07_

This document is the operational handoff for continuing the ecommerce storefront + admin CRM project. It intentionally records environment-variable **names and sources**, never secret values.

## Project status

- Framework: Next.js 16 App Router, React 19, Tailwind CSS 4.
- Package manager: `pnpm@12.3.4`.
- Primary database: Neon Postgres.
- File storage: Vercel Blob.
- AI integration: Vercel AI Gateway is connected, but no AI feature is currently required by the storefront/admin data layer.
- Deployment target: Vercel. The project is already linked in `.vercel/`.
- Existing database source of truth in the repository: `db/migrations/0001_storefront_workspace.sql`.
- Drizzle schema mirror: `lib/db/schema.ts`.
- Drizzle connection: `lib/db/index.ts`.
- Data access: `app/actions/storefront.ts`, `app/actions/admin.ts`.
- Read endpoints: `app/api/products/route.ts`, `app/api/admin/metrics/route.ts`.
- Client refresh hooks: `lib/hooks/use-storefront-data.ts`, `lib/hooks/use-admin-data.ts`.
- Sync notes: `docs/DATABASE_SYNC.md`.

## Connected integrations

Verified through the project integration inventory:

1. **Neon** — connected and supplies the Postgres connection variables below.
2. **Blob** — connected and supplies `BLOB_READ_WRITE_TOKEN`.
3. **Vercel AI Gateway** — connected and available for future AI features.

Do not replace Neon with another database unless explicitly requested. Do not add a second database driver or use `@neondatabase/serverless`; this project uses `pg` + Drizzle.

## Environment variables

The variables are managed by the Vercel/v0 project environment and mirrored into the local development environment. Use the project Vars/integration settings to inspect or change values. Never commit `.env*`, tokens, passwords, or full connection strings.

### Required for current database and storage code

| Variable | Source | Usage |
|---|---|---|
| `DATABASE_URL` | Neon | Primary pooled Postgres connection used by `lib/db/index.ts`. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | Server-side Blob uploads/deletes/list operations. |

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

Existing schema includes storefront/admin workspace tables for products, product assets, customers, orders, order items, and activity events. The migration also defines the `set_store_updated_at()` trigger function and updated-at triggers where applicable.

## Data synchronization contract

- Storefront reads flow through SWR hooks to `/api/products`, then Drizzle/Neon.
- Admin metrics flow through `/api/admin/metrics` and refresh on an interval.
- Admin mutations are server actions and should log activity events.
- After a successful admin mutation, call the relevant SWR `mutate()`/refresh function for immediate UI consistency.
- Current UI synchronization is polling/revalidation, not database WebSockets. Treat “realtime” as sync-ready periodic refresh unless a future agent adds an approved realtime transport.
- Every user-owned query must be scoped by authenticated user ID once authentication is added. Do not rely on client-side filtering.

## Deployment reference

- Vercel project is already linked locally via `.vercel/`.
- Use the Vercel project UI for normal preview/production publishing.
- If CLI deployment is explicitly needed, run commands from `/vercel/share/v0-project` with the project’s authenticated Vercel CLI context; use `pnpm` for package commands.
- Do not deploy from or commit the `.env` files.
- Before deployment, verify the Vercel project has the Neon and Blob integrations attached for the target environment (Development, Preview, and Production as appropriate).
- After deployment, verify `/`, `/api/products`, and `/api/admin/metrics` in the deployed environment and inspect Vercel logs if a runtime database/storage error appears.

## Validation checklist

From `/vercel/share/v0-project`:

```bash
pnpm exec tsx scripts/validate-schema.mjs
pnpm exec tsx scripts/validate-build.mjs
pnpm build
```

If `tsx` is not installed, run the scripts with the available Node runtime or add the missing development dependency only if the repository policy permits it. The canonical production check remains `pnpm build`.

Also inspect:

- `git diff -- db/migrations lib/db app/actions app/api lib/hooks docs`
- live Neon schema through the integration tool
- Vercel deployment/build logs after publishing

## Safe handoff rules

- Never print or commit secret environment values.
- Never use localStorage as the source of truth for products, orders, customers, or admin metrics.
- Never hardcode product/catalog records in the storefront once database-backed records are available.
- Preserve migration history; add a new migration instead of rewriting an applied migration.
- Keep SQL in `db/migrations/` and application queries in Drizzle modules.
- If a required integration variable appears missing, refresh the integration inventory once before concluding it is unavailable.

## Next recommended work

1. Finish the storefront/admin UI wiring for all category sections, slider content, reviews, and admin CRUD views.
2. Add authenticated admin authorization before exposing write actions or metrics in production.
3. Add Blob upload routes and persist returned asset path/URL in `store_product_assets`.
4. Add a true realtime transport only if the product requires sub-minute updates; preserve SWR as fallback.
5. Run schema validation, build validation, browser verification, then synchronize Git before handoff.
6. Keep this file updated whenever integrations, environment variables, deployment settings, or migration conventions change.

## Quick file map

```text
db/migrations/0001_storefront_workspace.sql
lib/db/schema.ts
lib/db/index.ts
app/actions/storefront.ts
app/actions/admin.ts
app/api/products/route.ts
app/api/admin/metrics/route.ts
lib/hooks/use-storefront-data.ts
lib/hooks/use-admin-data.ts
docs/DATABASE_SYNC.md
docs/NEXT_AGENT_HANDOFF.md
```

This file is a reference, not a secret store. The authoritative environment values remain in the connected Vercel project integrations and Vars settings.
