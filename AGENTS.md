# Repository AI Agent Instructions

These instructions describe the application that exists in this repository. Keep them aligned with the code and update `docs/NEXT_AGENT_HANDOFF.md` when architecture, integrations, or project status changes.

## Product and existing application

- This is a web storefront and admin-workspace prototype using the visible brand name **morrow.** The current storefront copy and CSS product art read as home/lifestyle goods. The repository does not currently establish that its catalog is an eye-contact-lens business.
- The original product brief calls this an **Eye Contact Lenses** e-commerce application. That conflicts with the current UI and sample content. Do not silently rename the brand, invent lens-specific product claims, or replace existing product content; resolve the product identity with the user before doing so.
- Preserve the existing storefront/admin experience and visual language unless a request explicitly calls for a redesign.

## Architecture and implementation

- The application is **Next.js App Router + React + TypeScript**, styled with Tailwind CSS 4. Use the existing Next.js route handlers and server actions; do not introduce a separate Express server or migrate frameworks without explicit approval.
- Keep server-side data access in `app/actions/`, HTTP endpoints in `app/api/`, shared database definitions in `lib/db/`, and client revalidation hooks in `lib/hooks/`. Reuse these boundaries rather than duplicating data access in components.
- The database client is Drizzle ORM over `pg`, connected through `DATABASE_URL` to the configured Neon Postgres database. Keep persistent catalog, order, and customer data in that shared database; do not make local files, hardcoded records, or browser storage the source of truth for business data.
- `db/migrations/` is the schema change history. Add a new numbered migration rather than rewriting an applied migration, then mirror the resulting schema in `lib/db/schema.ts` and update schema validation as needed.
- The storefront and Admin/CRM must use the same database and data access layer. Use SWR hooks and targeted `mutate()` calls to refresh affected client data after successful writes.
- Use Vercel Blob for uploaded product media and documents. Persist Blob URLs and metadata, not file contents. Check the installed dependencies and existing integration before adding upload functionality; the current schema has asset metadata, but do not assume that a complete upload flow already exists.

## Security and data handling

- Admin access currently uses one environment-configured operator account and an HTTP-only signed session (`lib/auth/admin.ts`). Every admin server action and admin API route must verify the session on the server. Keep customer/order data and business-critical writes behind those checks; do not describe this as multi-user role-based authentication or SSO.
- Admin access requires `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` in the target environment. The app fails closed if they are absent or invalid. The per-process login throttle is not distributed; use edge-level rate limiting before production exposure.
- The storefront basket is in-memory UI state only. Do not create customer/order records or claim checkout is available until a payment provider and the approved order-submission flow are implemented.
- Never hardcode credentials, tokens, or connection strings. Read or change environment values only through the configured environment/integration workflow; keep names and sources documented without recording values.
- Validate and constrain all server-side inputs, enforce allowed status values, use transactions where related writes must succeed together, and report failures rather than returning success-shaped fallbacks.
- Do not log personal data or secrets. Scope user-owned data to the authenticated user once authentication exists.

## GitHub operations and Actions

- Perform GitHub-side operations only while authenticated as **`@qaiserfccc`**. Before any GitHub mutation, verify the active identity with `gh api user --jq .login`; stop if it is not `qaiserfccc`. Do not switch accounts or use another user's credentials to get around a permission problem.
- Do not delegate GitHub mutations to another account or agent. Report permission or authentication blockers instead of bypassing them.
- There are currently no checked-in GitHub Actions workflows. If workflows are added, every job must be gated with `if: github.actor == 'qaiserfccc' && github.triggering_actor == 'qaiserfccc'` so workflow jobs do not run for other actors, including a different user rerunning a workflow. Apply the gate to every job, including reusable-workflow callers; do not rely on a separate guard job that other jobs can bypass.
- Workflow actor gates are repository code policy, not a substitute for GitHub repository access controls. Do not claim repository-wide exclusivity unless collaborator and organization permissions have also been verified.

## UI, workflow, and quality

- Build reusable, responsive React components that follow the current Tailwind and Lucide patterns. Include loading, empty, error, focus, and narrow-screen states for interactive/data-driven surfaces.
- Before editing, inspect the relevant route, component, data action, schema, and existing styles. Keep database schema, APIs/actions, client types, and UI behavior consistent.
- Do not treat placeholder navigation, cards, or controls as implemented features. Wire them to their intended behavior or label them clearly as unavailable.
- Use `pnpm` for package scripts. Run the narrow relevant checks and `pnpm build` for application changes. The repository currently has validation scripts at `scripts/validate-build.mjs` and `scripts/validate-schema.mjs`; schema validation requires `DATABASE_URL` and access to the configured database.
- Deploy only when requested. The deployment target is Vercel; inspect the existing project configuration and use its approved Vercel workflow/CLI rather than assuming deployment settings.

## Project memory

Read `docs/NEXT_AGENT_HANDOFF.md` before changing database integrations, environment variables, migrations, authentication, or deployment. Treat it as operational notes, not a secret store; verify time-sensitive details against the current code and connected project configuration.
