# Database-backed storefront and admin

The storefront and admin use the same Neon Postgres database through Drizzle. Client screens load route-handler data with SWR; writes use server actions that validate inputs, verify admin authorization where required, and create audit events in the same transaction as the database change.

## Storefront

- `GET /api/products` returns active products and associated public image metadata. It supports `category` and `q` filters and is refreshed by `useProducts`.
- `GET /api/products/[slug]` returns one active product with its images.
- Search, category selection, price, availability, and product imagery reflect the database catalog.
- The bag is in-page state only. It does not write customer or order records. Checkout is intentionally unavailable until an approved payment provider and order-submission flow are configured.
- Public server actions only expose catalog reads. Customer and order reads/writes are not callable from the public storefront.

## Admin authorization

- Admin sign-in is configured using `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET`.
- Sign-in issues an eight-hour, HTTP-only, same-site signed cookie. Admin API routes, upload routes, and every admin server action verify it on the server.
- Configure all three variables in each deployment environment before enabling admin access. Use a password of at least 16 characters and a cryptographically random session secret of at least 32 characters. The application fails closed if the configuration is absent or incomplete.
- The sign-in route also limits failed attempts per process. This is not a distributed limiter; production deployments should apply edge-level rate limiting. This implementation supports one configured admin identity, not multi-user roles or identity-provider SSO.
- Session status and admin responses are never cached. The public product API is the only endpoint with CDN caching.

## Admin routes and mutations

- `GET /api/admin/metrics` returns order counts, pending orders, counts by status, and recognized order value grouped by currency. Revenue includes paid, processing, shipped, and delivered orders; it excludes pending, cancelled, and refunded orders.
- `GET /api/admin/products`, `/orders`, `/customers`, and `/activity` require an admin session.
- Product create/edit/archive, stock updates, order status changes, and customer marketing-preference updates are authenticated server actions. Invalid values and invalid order-status transitions are rejected.
- Mutations create `store_activity_events` entries transactionally. Activity payloads do not contain customer names, addresses, email addresses, or other personal fields.
- Order and customer endpoints return 50 records per page with database counts and server-side customer search. The admin screens paginate through all matching records and expose empty/loading/error states.
- Admin writes refresh the relevant SWR keys immediately. Storefront catalog reads revalidate periodically and after product changes.

## Product image storage

- Admin uploads accept JPEG, PNG, WebP, or AVIF images up to 4 MB through `POST /api/admin/products/[productId]/assets`.
- Uploads go to Vercel Blob. The database stores only the Blob URL, pathname, alt text, and product relation in `store_product_assets`.
- `DELETE /api/admin/assets/[assetId]` removes the Blob and its metadata. Blob and database writes cannot share a transaction; the API reports cleanup failures rather than claiming success.
- `BLOB_READ_WRITE_TOKEN` must be configured for uploads and deletions.

## Data flow

```text
Storefront SWR ──> /api/products ──> public catalog reads ──> Neon
Admin SWR ───────> /api/admin/* ──> session-checked reads ──> Neon
Admin forms ─────> server actions ─> session + validation ──> Neon transaction + audit event
Image upload ────> authenticated route ──> Vercel Blob + asset metadata in Neon
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
