# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Shoppers in Pakistan who are browsing and comparing contact lenses online.
- Store operators managing products, media, availability, orders, and customer records.

## Product Purpose

ISK Lenses is intended to let shoppers browse a contact-lens catalog and let store operators manage its catalog and store operations.

## Positioning

Not established in the repository or the public source reviewed so far. Do not invent a differentiating clinical, comfort, safety, or quality claim.

## Operating Context

The public reference site is https://isklenses.com/. Its FAQ says it serves Pakistan and describes delivery and cash-on-delivery options; these are reference-site statements and must be confirmed by the operator before they are repeated as promises in this application.

## Capabilities and Constraints

- The existing application uses Next.js App Router, React, TypeScript, Tailwind CSS, Neon Postgres through Drizzle and `pg`, and Vercel Blob.
- Admin sessions are server-verified. The database-backed roles are owner, admin, and staff.
- The storefront basket is in-memory only. Checkout and order submission are not available until an approved payment and order-submission flow exists.
- Source-catalog imports create drafts for review. A later operator-directed publication changes status and stock, but does not mean the underlying specifications, media rights, or claims have been independently verified.
- Imported specifications, prices, stock, and regulatory or clinical claims must not be guessed. The store operator must verify them before publication.
- Audience, market, and source-site ownership are inferred from the user request and the public site because a structured confirmation request did not receive a response.

## Brand Commitments

- The requested customer-facing brand is **ISK Lenses**, replacing the previous lifestyle-goods identity.
- Preserve the requested ISK Lenses name; do not invent a logo asset, endorsement, certification, medical claim, or product proof.

## Evidence on Hand

- Public source site: https://isklenses.com/ (WordPress/WooCommerce; its public Store API exposes product names, categories, current prices, links, and source-image references).
- The public Store API exposed 495 listings. Its product variation arrays were empty; the snapshot contains 757 image references and no video references. The application did not copy image/video files to Vercel Blob. Eighty-nine listings lacked a source category.
- No owner-provided product specifications, endorsements, or compliance documents have been supplied in this repository.
- On 2026-10-10, the operator directed that all 495 imported records be published with a configured stock count of 5 each. This is operator-entered inventory, not independently verified stock or product validation. All 495 are active, and 89 source records without a category are labeled **Uncategorized**. There are no configured variant rows or stored product assets. Source descriptions and media files were not copied; source image references are retained as links in the database.

## Product Principles

- Keep product specifications and commercial terms traceable to a source and operator-reviewed before publication.
- Treat lens parameters as structured product data rather than descriptive copy.
- Distinguish verified catalog facts from imported, draft, or unknown information.
- Keep checkout unavailable until payment and order-handling behavior is approved and implemented.
