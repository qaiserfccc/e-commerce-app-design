# Architecture Overview — ISK Lenses

Short summary of key technical choices and where the important code lives.

## Stack

- Framework: Next.js App Router, React, TypeScript.
- Styling: Tailwind CSS 4.
- Package manager: `pnpm`.
- Database: Neon Postgres via `pg` and Drizzle ORM.
- File storage: database-backed media objects in Neon Postgres, delivered through cacheable same-origin routes.

## Code layout

- Migrations: `db/migrations/`, mirrored in `lib/db/schema.ts`.
- Server actions: `app/actions/`.
- API route handlers: `app/api/`.
- Client refresh hooks: `lib/hooks/`.

## Scripts

- `scripts/validate-build.mjs` — build validation.
- `scripts/validate-schema.mjs` — schema validation (requires `DATABASE_URL`).
- `scripts/rehost-source-product-images.mjs` — restores product photos into the database-backed media library.
- `scripts/restore-content-images.mjs` — restores seeded storefront images into the database-backed media library.

## Security notes

- Admin sessions require `ADMIN_SESSION_SECRET`.
- Never commit secrets; keep env values in Vercel project variables.
