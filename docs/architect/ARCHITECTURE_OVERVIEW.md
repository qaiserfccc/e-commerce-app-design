# Architecture Overview — ISK Lenses

Short summary of key technical choices and locations of important code.

- Framework: Next.js App Router (v16), React (v19), TypeScript.
- Styling: Tailwind CSS 4.
- Package manager: `pnpm`.
- Database: Neon Postgres accessed via `pg` + Drizzle ORM. Schema files under `db/migrations/` and mirrored in `lib/db/schema.ts`.
- File storage: Vercel Blob for product and site media (`BLOB_READ_WRITE_TOKEN`).
- Data access:
  - Server actions: `app/actions/`
  - API route handlers: `app/api/`
  - Client refresh hooks: `lib/hooks/`

- Important scripts:
  - `scripts/validate-build.mjs` — build validation
  - `scripts/validate-schema.mjs` — schema validation (requires `DATABASE_URL`)
  - `scripts/rehost-source-product-images.mjs` — rehosts product images into Blob

- Security notes:
  - Admin sessions require `ADMIN_SESSION_SECRET`.
  - Never commit secrets; use Vercel project Vars for env values.
