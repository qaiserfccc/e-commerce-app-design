# MemoriPilot: System Architect

## Overview
This file contains the architectural decisions and design patterns for the MemoriPilot project.

## Architectural Decisions

- Canonical docs consolidated under `docs/architect/` and redundant root `AGENTS.md` removed.
- Use Neon Postgres + Drizzle as single DB path; migrations must be new numbered SQL files.
- Vercel Blob is the only supported file store for product assets; persist only Blob URLs and metadata.



1. **Decision 1**: Description of the decision and its rationale.
2. **Decision 2**: Description of the decision and its rationale.
3. **Decision 3**: Description of the decision and its rationale.



## Design Considerations

- Do not add a second database driver or switch to Supabase/Prisma without approval.
- All admin server actions must verify signed sessions on server side.
- Any GitHub Actions added must be gated to `qaiserfccc` actor.



## Components

### Next.js App Router

Frontend and server actions live in Next.js routes and server actions.

**Responsibilities:**

- Routing
- Server actions
- API endpoints

### Neon Postgres + Drizzle

Primary relational DB with migrations in `db/migrations/` and mirrored schema in `lib/db/schema.ts`.

**Responsibilities:**

- Persist products, orders, customers, admin users
- Migration history and schema validation

### Vercel Blob

Asset storage for product images and site media.

**Responsibilities:**

- Store media files
- Provide Blob URLs saved in database metadata



