# Project Agent Instructions — ISK Lenses Storefront

This file is the canonical agent-facing instructions for working on this repository.

- **Repository scope**: Next.js App Router + React + TypeScript storefront and admin for ISK Lenses. Data and media objects are persisted in Neon Postgres via Drizzle/`pg`.
- **Primary branches**: `main` is canonical. Work on topic branches, open PRs to `main` when ready.
- **GitHub identity**: All GitHub mutations must be performed as `@qaiserfccc` — verify with:

```bash
gh api user --jq .login

# proceed only when result is exactly: qaiserfccc
```

- **Production database and GitHub identity (strict):** use only the verified Neon Production database `neondb` associated with the `e-commerce-app-design` Vercel Production project as the authoritative business-data source. Verify the database target before every database operation; never assume `.env.local`, a branch, or a prior session points to Production. Do not substitute local, preview, or staging databases for production data. Every GitHub mutation—including commits, pushes/sync, PR updates, merges, and workflow operations—must be attributed to `qaiserfccc`; verify `gh api user --jq .login` immediately before the mutation and stop if it is not exactly `qaiserfccc`.

- **Packaging & build**: use `pnpm` (scripts validated by `scripts/validate-build.mjs`). Typical checks:

```bash
pnpm exec tsc --noEmit
node scripts/validate-build.mjs
pnpm build
```

- **Database workflow**:
  - Add schema DDL as a new numbered file under `db/migrations/` (do not rewrite applied migrations).
  - Apply DDL to the verified Neon Production database when the task explicitly requires a production schema/data change, update `lib/db/schema.ts` to mirror it, and verify the live database identity before running `scripts/validate-schema.mjs`. Never use `.env.local` to choose a production target.

- **Runtime & operations**:
  - Admin sessions require `ADMIN_SESSION_SECRET`. Shopper sessions use `CUSTOMER_SESSION_SECRET` or derive from admin secret.
  - Admin password recovery (`/admin/forgot-password`) is enabled only when `ADMIN_RECOVERY_KEY` (8+ characters) is set; owners can also reset other accounts from the System users panel.
  - Media uploads are stored in `store_media_objects` in Neon and served through `/api/media/[...path]`. Do not reintroduce a hosted object-store dependency.
  - Do not commit secret values. Use the `e-commerce-app-design` Vercel project in `pro-team-trial-bc9638f2` for production secrets and `.env.production.local` only for local operations. Its Production database URL connects to the populated Neon `neondb` catalog (405 active products; 401 matched active products with SEO payloads and correct canonicals). `ADMIN_SESSION_SECRET` and `ADMIN_RECOVERY_KEY` are configured in Production. Do not use the unrelated `isk-lenses-website-migration` project.
  - **Domain safety:** `isklenses.com` is attached to the verified Vercel project; `www.isklenses.com` redirects to the apex. No DNS changes were made. `isklenses.online` remains on Hostinger and currently returns HTTP 500.
  - **Retired hosting experiments:** Hostinger MySQL was not adopted. Cloudflare's D1 database (empty except for a migration-seeded sequence row) and its Hyperdrive config were deleted; no Pages project or R2 bucket existed. Keep Neon as the only database source of truth. Do not restore Cloudflare/Vinext/D1 deployment code.
  - **Local database safety:** `isklenses_local` is the schema-only development database; `isklenses_production_copy` is a sensitive local snapshot and must never be exposed or committed. `.env.production.local` is ignored and mode `0600`. The previous `vercel link` replaced `.env.local` with Development variables; the original contents were not recoverable, so inspect/recreate `.env.local` before local development. Do not expose a workstation or private LAN IP in public DNS.
  - **Local Hostinger catalog import (2026-11-10):** `scripts/import-hostinger-catalog.mjs` imports the public Hostinger mirror only into loopback PostgreSQL database `isklenses_production_copy`; it rejects remote hosts/database names. Set both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` explicitly to the loopback copy before invoking the script; `.env.local` was replaced by Vercel Development variables and must not be trusted as the prior local configuration. The local copy now contains 495 source products plus four existing local-only products. Ninety-two newly added products are drafts with zero stock; existing active status and inventory were preserved. The public source has no reviews, and the three pre-existing local review rows were left unchanged. Eighty-nine products with no source categories use hidden/inactive `Uncategorized`; 33 categories, 264 source-link relations, 757 same-origin image references, and extracted specifications are present. Do not infer inventory from the source availability boolean or fabricate reviews. Source category 17 is “Contact Lenses,” but the local lens-type row is currently “1 Year”; preserve existing product assignments until that taxonomy conflict is reviewed. No schema or API contract change was required.
  - **Production SEO and media reconciliation:** The guarded `scripts/sync-hostinger-product-seo.mjs` defaults to a dry run and requires `--apply` for the expected Neon `neondb` production target. It imports AIOSEO fields only for active products matched by source ID, preserves current slugs and all non-SEO catalog/order/customer fields, and rehosts source SEO media into Neon media storage. The current production inventory has 405 active products, including 401 matched products with SEO payloads and correct canonicals; there are zero drafts. Do not import or activate the 94 absent source listings. Product metadata, JSON-LD, `robots.txt`, and `sitemap.xml` are intentionally web-only SEO surfaces; existing public product API SEO fields and media remain unchanged for Flutter. The mirror blocks Googlebot, so the ISK robots route must continue to allow the site and `/api/media/`. The crawler routes become live only after a production deployment containing them.

- **Areas of responsibility**:
  - Keep server-side data access inside `app/actions/` and HTTP endpoints under `app/api/`.
  - Maintain DB schema in `db/migrations/` and corresponding Drizzle schema in `lib/db/schema.ts`.
  - Keep client-side revalidation in `lib/hooks/` and use targeted `mutate()` calls after server mutations.
  - **Platform boundary:** Next.js remains the canonical web app, trusted API, and business-rules backend. Flutter is the intended Android/iOS client and must use the documented REST/OpenAPI contract. Do not add TanStack Start as a parallel backend or silently migrate the existing app/auth; TanStack DB is an optional web data layer, not a second source of truth.
  - **API/mobile parity is mandatory:** whenever a storefront or admin behavior, data field, validation rule, filter, sorting rule, visibility rule, or workflow changes, update the corresponding public or authenticated API in the same change so mobile clients (including Flutter/FlutterFlow) can observe and perform the same behavior. Keep the API discovery document, OpenAPI contract, and `docs/API_MOBILE_INTEGRATION.md` aligned whenever endpoint behavior or schemas change. Never leave a web-only behavior without explicitly documenting why parity is impossible or intentionally out of scope.
  - Trace each change through UI, shared data/domain logic, route handlers, response schemas, and API documentation. Add or update parity tests/contract validation when suitable coverage exists.
  - **Product presence:** anonymous UUID-based viewing sessions expire from counts after two minutes; do not label them verified unique people or replace unavailable counts with synthetic values. Apply migration `0024_product_viewer_presence.sql` separately and configure distributed rate limiting and periodic expiry cleanup in production.
  - **Order details:** preserve existing guest customers, orders and statuses. Restrict detail reads to the matching signed receipt or account owner. A receipt authorizes only the latest order in that device's cookie and expires; never expose address or order details using a reference number alone. Order status is not a courier feed or per-item tracking history.
  - **Blog resources:** original articles are code-managed and available through `/api/blogs`; the website and mobile API also link to the third-party archive without copying its content. Do not treat the external archive as ISK-owned articles. There is no blog database or admin editor.
  - **Checkout address:** account autofill reads the latest account-owned order via the private no-store shopper session endpoint; never use guest or email-matched orders. Guest email is nullable after migration `0025_optional_customer_email.sql`, while account authentication still requires a valid email. Preserve editable fields and existing records. Blog images are original illustrations, not product photos.
  - **Brand assets:** keep the supplied ISK eye/lettermark aligned across the web shell, browser icons and Flutter bundled logo and Android/iOS launcher icons. They are static app assets and do not change the commerce API contract.
  - **Shared homepage and appearance configuration:** use `GET /api/storefront/home` as the single source for hero banners, palette/control styles, homepage section visibility/order/copy, and hero layout/autoplay across web and Flutter. Admin changes go through the validated content-setting operations; keep OpenAPI and the mobile integration guide synchronized. Apply and verify migration `0021_home_and_appearance_settings.sql` in each target database before saving these settings; never imply that authoring a migration applied it.
  - **Lens deals and gifts:** keep category-combination offer matching identical in the web preview, Flutter preview, and authoritative checkout recalculation. Every selected category must contribute a distinct item to a bundle; apply only the best-saving offer (priority then stable ID break ties). Show gift choices only during checkout, after current deal eligibility is verified, when no deal applies and the discounted merchandise subtotal is at least PKR 2,500; enforce gift validity again on the server. Keep `/api/storefront/deals`, `/api/storefront/gift`, `/api/storefront/home` chrome fields, OpenAPI, and the mobile guide aligned. Migration `0026_lens_promotions.sql` extends the settings-key constraint; apply it to each target database before admins save deals, and never imply that authoring it applied it.
  - **Read-replica migrations:** a Neon read-only endpoint on the same primary branch replays primary DDL; wait for replication and verify the schema instead of writing to that endpoint. Apply migrations separately to independent branches/databases with their writable migration connection, then validate before routing `DATABASE_READ_URL` there. Never enable a reader missing application tables or before confirming its role is read-only.
  - **Realtime and agents:** Neon Realtime requires explicit provisioning and verified server variables. The optional Mastra chatbot uses `AI_GATEWAY_API_KEY` only on the server and is grounded from current public API/database data; it is stateless and must not receive database credentials, customer records, or business-write tools. Never expose `DATABASE_URL`, Realtime signing secrets, or model-provider credentials to browser/native clients. Realtime subscriptions must be server-authorized and do not replace API permission checks. Any future background agents must use durable application events and route writes through existing permission-checked operations.

- **Security & safety**:
  - Never hardcode credentials, tokens or plaintext secrets.
  - Validate all server-side inputs and enforce allowed status values.
  - Admin GitHub operations must be verified (`gh api user`) and performed only as `qaiserfccc`.

- **Agent handoff & memory**: Read `docs/NEXT_AGENT_HANDOFF.md` for operational context before changing database integrations, migrations, authentication, or deployment.

- **When adding workflows or actions**: Gate every job with `if: github.actor == 'qaiserfccc' && github.triggering_actor == 'qaiserfccc'`.

If you are uncertain about an operation that touches DB, secrets, or deployment, stop and request explicit review from the repository owner.

## Power lens pricing and shared carousels

- Power options are configured in the `power_options` setting (admin: Power lens options); checkout recomputes base + per-eye surcharge server-side and compares quotes in cents. Keep web, Flutter and OpenAPI aligned.
- For products offering power choices, require an explicit plain/power choice. Plain orders use base price and persist `plain` in both order-item eye fields; legacy power orders with both valid eye values remain accepted. Toric ordering remains WhatsApp-only.
- Homepage directory sections are paginated at 15 items via `GET /api/storefront/home/sections/{section}` and use the shared carousels (web `components/ui/shared-carousel.tsx`, Flutter `isk_carousel.dart`); change both together.
- Product/catalog imagery uses contain-fit; heroes may use cover. Hero images are topped up to five shared defaults.

- Free Cosmetic gift: `free_gift` setting, `GET /api/storefront/gift`, `giftProductId`/`giftConfirmed` on orders; lens line = non-Cosmetics product. Homepage carousels are full width; lens types use the continuous carousel on web and mobile.

- Gift flash bar links to checkout; gift choices are checkout-only and never shown on the cart page. Homepage `showcase` section (config id `showcase`) with big spotlight images; default order puts brands 6th. Keep web and Flutter identical.
- Bulk price/power product endpoints (`/api/admin/products/bulk-price|bulk-power`) must stay in parity with admin product list tools; default power values 0.00 to -14.00.
- Cache public catalog and content through `lib/cache.ts`; cache keys use PostgreSQL MVCC snapshots to detect committed writes, including direct SQL, without write-side triggers. Snapshot reads add a database call and unrelated transactions can invalidate entries. Keep checkout validation and private data uncached; self-hosted multi-instance deployments need a shared Next.js cache handler and the same primary database.
- Toric lens types are surfaced in a derived Toric category and require WhatsApp confirmation and full advance payment; cash-on-delivery orders reject them server-side. Do not infer Toric prescription ranges, pricing, or payment status from other retailers. See `docs/API_MOBILE_INTEGRATION.md`.
- The Android download is the website-hosted `/isklenses.apk` exposed through `GET /api/mobile/android`. Verify the original release signing fingerprint and increment the version code before replacing the file; never publish debug-signed APKs or change the stable signing key. See `apps/mobile/README.md`.
- Read-only public catalog/content/chatbot/gift-offer queries may use `DATABASE_READ_URL`; keep checkout, auth, orders, media, and writes on `DATABASE_URL`. Configure only a dedicated Neon read-only role/endpoint, never the owner URL. Replication lag is expected for those public cached reads.
