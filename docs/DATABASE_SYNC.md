# Database-backed storefront and admin

The storefront and admin use the same Neon Postgres database through Drizzle. Client screens load route-handler data with SWR; writes use server actions that validate inputs, verify admin authorization where required, and create audit events in the same transaction as the database change.

## Storefront

- `GET /api/products` returns active products, supported public media metadata, and active lens options. It supports `category` and `q` filters and is refreshed by `useProducts`.
- `GET /api/products/[slug]` returns one active product with its public media and active options.
- Search, category selection, price, availability, and product imagery reflect the database catalog.
- The bag is in-page state only. It does not write customer or order records. Checkout is intentionally unavailable until an approved payment provider and order-submission flow are configured.
- Public server actions only expose catalog reads. Customer and order reads/writes are not callable from the public storefront.

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

- `GET /api/admin/metrics` returns order counts, pending orders, counts by status, and recognized order value grouped by currency. Revenue includes paid, processing, shipped, and delivered orders; it excludes pending, cancelled, and refunded orders.
- `GET /api/admin/products`, `/orders`, `/customers`, and `/activity` require an admin session.
- Product create/edit/archive, stock updates, order status changes, and customer marketing-preference updates are authenticated server actions. Invalid values and invalid order-status transitions are rejected.
- Product options support SKU, color, prescription power, base curve, diameter, pack size, price, currency, and stock. Parent price and stock are derived from active options; direct price/stock edits are blocked while options are active.
- `POST /api/admin/products/import` reads the public ISK Lenses WooCommerce Store API in pages of 50. It is admin-protected and source IDs are unique, so reruns skip listings already imported. Source price and source links are retained for review; product descriptions and image files are not copied. Every import is a draft with zero stock, and missing source categories are labeled `Uncategorized`.
- System-user listing, creation, and activation/deactivation are owner-only. Passwords require at least 16 characters and are stored as salted scrypt hashes.
- Mutations create `store_activity_events` entries transactionally. Activity payloads do not contain customer names, addresses, email addresses, or other personal fields.
- Order and customer endpoints return 50 records per page with database counts and server-side customer search. The admin screens paginate through all matching records and expose empty/loading/error states.
- Admin writes refresh the relevant SWR keys immediately. Storefront catalog reads revalidate periodically and after product changes.

## Product media storage

- Admin uploads accept JPEG, PNG, WebP, or AVIF images and MP4 or WebM video up to 4 MB through `POST /api/admin/products/[productId]/assets`.
- Uploads go to Vercel Blob. The database stores only the Blob URL, pathname, alt text, and product relation in `store_product_assets`.
- Admins can reorder assets with `PATCH /api/admin/assets/[assetId]`. `DELETE /api/admin/assets/[assetId]` removes the Blob and its metadata. Blob and database writes cannot share a transaction; the API reports cleanup failures rather than claiming success.
- `BLOB_READ_WRITE_TOKEN` must be configured for uploads and deletions.

## Lens catalog state

Migration `0003_isk_lens_catalog.sql` is applied to the connected Neon database. It adds source provenance, image/video media typing, product variants, PKR as the product currency default, and updated-at triggers. The initial public-catalog import created 495 draft listings with zero stock. Of these, 89 source records lacked a category and are marked `Uncategorized`. No source description or image files were copied; operators must verify each listing and supply approved lens specifications and media before publishing.

## Data flow

```text
Storefront SWR ──> /api/products ──> public catalog reads ──> Neon
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
