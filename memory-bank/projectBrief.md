# ISK Lenses Storefront — Agent Handoff & Project Brief

## Purpose

Define the main purpose of this project.

## Target Users

Describe who will use this.


## Project Summary

E-commerce storefront and admin for ISK Lenses. Next.js App Router + React + TypeScript; Drizzle ORM with Neon Postgres. Product and storefront media bytes live in Neon `store_media_objects` and are served through `/api/media/[...path]`. Canonical docs consolidated under `docs/architect/`. GitHub operations must use @qaiserfccc identity. Use `pnpm` and follow migration rules for DB schema.



## Goals

- Preserve current Next.js architecture and server actions
- Keep DB schema authoritative in `db/migrations/` and `lib/db/schema.ts`
- Ensure admin/auth security with `ADMIN_SESSION_SECRET` and careful handling of secrets
- Maintain single canonical docs in `docs/architect/` and update memory bank on changes



## Constraints

- Do not hardcode secrets
- Do not rewrite applied migrations
- Admin GitHub mutations must be done as `@qaiserfccc`
