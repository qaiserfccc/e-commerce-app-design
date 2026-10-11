# Database-backed storefront and admin

The storefront and admin use the same Neon Postgres database through Drizzle. Client screens load route-handler data with SWR; writes use server actions that validate inputs, verify admin authorization where required, and create audit events in the same transaction as the database change.

## Storefront

- `GET /api/products` returns active products, supported public media metadata, and active lens options. It supports `category` and `q` filters and is refreshed by `useProducts`.
- `GET /api/products/[slug]` returns one active product with its public media and active options.
- `/products` is the full public catalog index. It loads every active product, supports live category/search navigation, and links each recorded option to its matching product detail selection. It does not manufacture lens options that are absent from the database.
- Search, category selection, price, availability, and product imagery reflect the database catalog. Uploaded hero/gallery images and imported source photos are stored in Vercel Blob; storefront components accept only Blob URLs and public product APIs do not expose source image URLs. Failed images fall through to the next Blob image or the no-photo state.
- `GET /api/product-categories` returns the stored ISK Lenses category taxonomy. `/products` and the home storefront browse source categories and multiple nested levels, with live counts from product assignments; `POST /api/admin/product-categories/sync` refreshes the taxonomy from the source site for authorized admins.
- The bag is in-page state only. `/checkout` supports cash-on-delivery order submission for guests and registered shoppers; no online payment is collected.
- `POST /api/orders` reprices and validates current published products/options, serializes stock reservations in a transaction, uses an idempotency key, and writes the COD order, order lines, shopper, and audit event together. Cancelled reservations are returned to available stock.
- The recorded total initially equals the product subtotal. A store operator must confirm any delivery fee with the shopper before dispatch; the Admin order workflow records the fee and blocks shipping until confirmation. No tax calculation or payment-provider integration is present.
- Shopper accounts use scrypt password hashes and signed HTTP-only sessions. The account email is not verified, password reset is not implemented, and an existing customer record cannot be claimed by self-registration; those shoppers may use guest checkout. The receipt is shown only with a short-lived signed browser cookie; customer order history is not implemented.
- Public order and account endpoints require same-origin JSON requests, bound request-body sizes, and apply best-effort per-process rate limits. Configure distributed edge-level rate limiting before production exposure.

## Admin authorization

- Admin sign-in uses `store_admin_users` and `ADMIN_SESSION_SECRET`. Passwords are scrypt-hashed in the database; the signed HTTP-only cookie references a database user and session version.
- Sign-in issues an eight-hour, HTTP-only, same-site signed cookie. Admin API routes, upload routes, and every admin server action verify it on the server.
- Configure a cryptographically random `ADMIN_SESSION_SECRET` of at least 32 characters in each deployment environment. The application fails closed if it is absent or invalid.
- The initial owner is provisioned once using `node --env-file=.env.local scripts/bootstrap-admin.mjs`; the local `ADMIN_EMAIL` and `ADMIN_PASSWORD` values are bootstrap-only and are not used for sign-in. Create subsequent staff/admin accounts in the owner-only System users panel.
- Staff accounts are read-only, admins can mutate store data, and owners can also manage system users. Owner access is required to create or deactivate accounts. The app does not support identity-provider SSO. Deactivation increments the session version and invalidates active sessions.
- The sign-in route also limits failed attempts per process. This is not a distributed limiter; production deployments should apply edge-level rate limiting.
- For local verification only, set `ADMIN_LOGIN_PREFILL=true` in ignored `.env.local` alongside the bootstrap `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The form offers a one-click **Quick sign in** button after prefill; the session endpoint returns these values only in development on a localhost hostname with no existing session. Preview and Production never prefill credentials or offer the shortcut.
- Session status and admin responses are never cached. The public product API is the only endpoint with CDN caching.

## Admin routes and mutations

- `GET /api/admin/metrics` returns order counts, pending orders, counts by status, and recognized order value grouped by currency. COD revenue is recognized only after payment is marked paid; other payment-method orders retain the existing paid/processing/shipped/delivered recognition rule. Pending, cancelled, and refunded orders are excluded.
- `GET /api/admin/products`, `/orders`, `/customers`, and `/activity` require an admin session.
- Product create/edit/archive, stock updates, order status changes, delivery-fee confirmation, and customer marketing-preference updates are authenticated server actions. Invalid values and invalid order-status transitions are rejected. COD orders can be marked paid only after delivery; they cannot be shipped until delivery fees are confirmed.
- Product options support SKU, color, prescription power, base curve, diameter, pack size, price, currency, and stock. Parent price and stock are derived from active options; direct price/stock edits are blocked while options are active.
- `POST /api/admin/products/import` reads the public ISK Lenses WooCommerce Store API in pages of 50. Each page is staged and validated; the live product catalog is replaced in one transaction only after the final page succeeds. A failed, empty, oversized, or incomplete import leaves the existing catalog untouched. The staging run is resumable only in sequence and expires after 24 hours.
- Imported `source_payload` retains the public API's structured factual fields, pricing, category/tag/brand and option metadata, stock/availability flags, source image references, and any video URLs exposed in video-specific API fields. Product-table specifications and package contents embedded in the source description are extracted as factual label/value data. Descriptive/marketing text, HTML, image alt copy, and binary media files are not copied; the source description is fingerprinted for change detection, and operators can open the original listing/media links in Admin.
- The importer itself does not download or rehost source photos/videos. After import, `node --env-file=.env.local scripts/rehost-source-product-images.mjs` copies validated `isklenses.com` upload images into Vercel Blob and stores Blob URLs and metadata in Neon. It accepts only supported image signatures, approved HTTPS source hosts and upload paths, enforces a 12 MB limit, retries network failures, and is idempotent. The current snapshot contained no source video links. Each import still creates draft records with zero stock; missing source categories are labeled `Uncategorized`.
- System-user listing, creation, and activation/deactivation are owner-only. Passwords require at least 16 characters and are stored as salted scrypt hashes.
- Mutations create `store_activity_events` entries transactionally. Activity payloads do not contain customer names, addresses, email addresses, or other personal fields.
- Order and customer endpoints return 50 records per page with database counts and server-side customer search. Customer password hashes and checkout idempotency/account internals are not returned to admin clients. COD revenue is counted only after an order is marked paid. The admin screens paginate through all matching records and expose empty/loading/error states.
- Admin writes refresh the relevant SWR keys immediately. Storefront catalog reads revalidate periodically and after product changes.

## Product media storage

- Admin uploads accept JPEG, PNG, WebP, or AVIF images and MP4 or WebM video up to 4 MB through `POST /api/admin/products/[productId]/assets`.
- Uploads go to Vercel Blob. The database stores only the Blob URL, pathname, alt text, and product relation in `store_product_assets`.
- Admins can reorder assets with `PATCH /api/admin/assets/[assetId]`. `DELETE /api/admin/assets/[assetId]` removes the Blob and its metadata. Blob and database writes cannot share a transaction; the API reports cleanup failures rather than claiming success.
- `BLOB_READ_WRITE_TOKEN` must be configured for uploads and deletions.

## Lens catalog state

Migrations `0003_isk_lens_catalog.sql`, `0004_isk_source_snapshot_import.sql`, `0005_cod_checkout_and_customer_accounts.sql`, and `0006_store_product_categories.sql` are applied to the connected Neon database; schema validation passes. Migration `0005` adds shopper credentials/session versions, COD and delivery-fee fields, order idempotency, and stock-reservation metadata. Apply migrations to each other target database before enabling checkout there. The latest complete import contains 495 distinct source listings; on 2026-10-10 the operator directed that all be published with a configured stock quantity of 5 each. This stock was explicitly entered by the operator, not inferred from source data. Eighty-nine products are `Uncategorized`. The saved snapshot contains 757 source-image links across 406 listings, and 374 listings have extracted product-table data; the source API exposed no video links. All 757 image references are now represented by Blob-backed assets across 406 products; no non-Blob hero or image URLs remain. There are no configured lens-option rows or source video assets. Source descriptions were not copied. The listing facts, stock, specifications, and image rights have not been independently verified.

## Data flow

```text
Storefront SWR ──> /api/products ──> public catalog reads ──> Neon
Checkout ────────> /api/orders ────> reprice + reserve stock ──> Neon transaction + audit
Shopper account ─> /api/storefront/session ──> signed session + shopper auth ──> Neon
Admin SWR ───────> /api/admin/* ──> session-checked reads ──> Neon
Admin forms ─────> server actions ─> session + validation ──> Neon transaction + audit event
Media upload ────> authenticated route ──> Vercel Blob + asset metadata in Neon
Catalog import ──> authenticated route ──> public ISK Store API ──> draft records + audit events
```

Polling/revalidation is used; the application does not use database WebSockets. Do not describe these updates as instantaneous realtime subscriptions.

## Validation

From the repository root:

```bash
pnpm exec tsc --noEmit
node scripts/validate-build.mjs
pnpm build
```

`node scripts/validate-schema.mjs` requires `DATABASE_URL` and access to the configured Neon database. Never print environment variable values when diagnosing a connection issue.
