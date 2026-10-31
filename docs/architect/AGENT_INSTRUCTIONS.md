# Project Agent Instructions — ISK Lenses Storefront

This file is the canonical agent-facing instructions for working on this repository.

- **Repository scope**: Next.js App Router + React + TypeScript storefront and admin for ISK Lenses. Data and media objects are persisted in Neon Postgres via Drizzle/`pg`.
- **Primary branches**: `main` is canonical. Work on topic branches, open PRs to `main` when ready.
- **GitHub identity**: All GitHub mutations must be performed as `@qaiserfccc` — verify with:

```bash
gh api user --jq .login

# proceed only when result is exactly: qaiserfccc
```

- **Packaging & build**: use `pnpm` (scripts validated by `scripts/validate-build.mjs`). Typical checks:

```bash
pnpm exec tsc --noEmit
node scripts/validate-build.mjs
pnpm build
```

- **Database workflow**:
  - Add schema DDL as a new numbered file under `db/migrations/` (do not rewrite applied migrations).
  - Apply DDL to Neon, update `lib/db/schema.ts` to mirror live schema, and run `node --env-file=.env.local scripts/validate-schema.mjs` (requires `DATABASE_URL`).

- **Runtime & operations**:
  - Admin sessions require `ADMIN_SESSION_SECRET`. Shopper sessions use `CUSTOMER_SESSION_SECRET` or derive from admin secret.
  - Admin password recovery (`/admin/forgot-password`) is enabled only when `ADMIN_RECOVERY_KEY` (8+ characters) is set; owners can also reset other accounts from the System users panel.
  - Media uploads are stored in `store_media_objects` in Neon and served through `/api/media/[...path]`. Do not reintroduce a hosted object-store dependency.
  - Do not commit secret values; use the Vercel UI for environment variables.

- **Areas of responsibility**:
  - Keep server-side data access inside `app/actions/` and HTTP endpoints under `app/api/`.
  - Maintain DB schema in `db/migrations/` and corresponding Drizzle schema in `lib/db/schema.ts`.
  - Keep client-side revalidation in `lib/hooks/` and use targeted `mutate()` calls after server mutations.
  - **API/mobile parity is mandatory:** whenever a storefront or admin behavior, data field, validation rule, filter, sorting rule, visibility rule, or workflow changes, update the corresponding public or authenticated API in the same change so mobile clients (including Flutter/FlutterFlow) can observe and perform the same behavior. Keep the API discovery document, OpenAPI contract, and `docs/API_MOBILE_INTEGRATION.md` aligned whenever endpoint behavior or schemas change. Never leave a web-only behavior without explicitly documenting why parity is impossible or intentionally out of scope.
  - Trace each change through UI, shared data/domain logic, route handlers, response schemas, and API documentation. Add or update parity tests/contract validation when suitable coverage exists.

- **Security & safety**:
  - Never hardcode credentials, tokens or plaintext secrets.
  - Validate all server-side inputs and enforce allowed status values.
  - Admin GitHub operations must be verified (`gh api user`) and performed only as `qaiserfccc`.

- **Agent handoff & memory**: Read `docs/NEXT_AGENT_HANDOFF.md` for operational context before changing database integrations, migrations, authentication, or deployment.

- **When adding workflows or actions**: Gate every job with `if: github.actor == 'qaiserfccc' && github.triggering_actor == 'qaiserfccc'`.

If you are uncertain about an operation that touches DB, secrets, or deployment, stop and request explicit review from the repository owner.
