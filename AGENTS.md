<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository-wide implementation rules

- **API/mobile parity is mandatory.** Whenever a storefront or admin behavior, data field, validation rule, filter, sorting rule, visibility rule, or workflow changes, update the corresponding public or authenticated API in the same change so mobile clients (including Flutter/FlutterFlow) can observe and perform the same behavior. Keep the API discovery document, OpenAPI contract, and `docs/API_MOBILE_INTEGRATION.md` aligned whenever endpoint behavior or schemas change. Do not silently leave a web-only behavior: if parity is impossible or intentionally out of scope, explain that explicitly in the change summary and integration documentation.
- **Check all relevant surfaces before finishing.** Trace the changed behavior through the UI, shared data/domain logic, route handlers, response schemas, and API documentation. Add or update tests/contract validation for parity where the repository has suitable coverage.
- **Preserve the cross-platform boundary.** Next.js remains the canonical web app, trusted API, and business-rules backend; Flutter clients for Android/iOS use the documented REST/OpenAPI contract. Do not add TanStack Start as a parallel backend or silently migrate the existing authentication system. Neon Realtime requires explicit provisioning; the optional, stateless Mastra chatbot requires the server-only `AI_GATEWAY_API_KEY` and uses only current public FAQ/catalog facts. Keep database, Realtime, and model-provider secrets server-side; realtime subscriptions never replace API authorization, and future agent business writes must go through permission-checked operations.
- **Persist durable decisions.** Keep these rules and important operational decisions in `docs/architect/AGENT_INSTRUCTIONS.md` and `docs/NEXT_AGENT_HANDOFF.md` so future agents receive them even when conversation history is unavailable.
- **Production database rule:** all agents must use the verified Neon Production database (`neondb` in the `e-commerce-app-design` Vercel Production project) as the sole authoritative catalog/business-data source. Before any database operation, verify the target database identity; do not infer production from `.env.local`, a branch name, or a remembered connection. Never redirect production work to a local, preview, or staging database. For production writes, use only the specifically requested operation and verify the resulting state.
- **GitHub identity rule:** every GitHub mutation—including commit attribution, push/sync, pull-request creation or edits, merge, and workflow operations—must be performed as `qaiserfccc`. Verify `gh api user --jq .login` immediately before GitHub CLI mutations and stop if it does not return exactly `qaiserfccc`; set the local commit author to that user's configured identity before committing.
