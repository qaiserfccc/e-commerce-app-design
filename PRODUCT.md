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
- The requested source-catalog import is assumed to create draft records for review, not publish products automatically.
- Imported specifications, prices, stock, and regulatory or clinical claims must not be guessed. The store operator must verify them before publication.
- Audience, market, and source-site ownership are inferred from the user request and the public site because a structured confirmation request did not receive a response.

## Brand Commitments

- The requested customer-facing brand is **ISK Lenses**, replacing the previous lifestyle-goods identity.
- Preserve the requested ISK Lenses name; do not invent a logo asset, endorsement, certification, medical claim, or product proof.

## Evidence on Hand

- Public source site: https://isklenses.com/ (WordPress/WooCommerce; its public Store API exposes product names, categories, current prices, links, and source-image references).
- At the initial import, the public Store API exposed 495 listings. The connected database contains 495 corresponding drafts with zero stock. Eighty-nine listings lacked a source category; no descriptions or source image files were copied.
- No owner-provided product specifications, endorsements, or compliance documents have been supplied in this repository.
- The initial source import created 495 draft product records in the connected database. All have zero stock; 89 source records had no category and are labeled **Uncategorized** for operator review. Source descriptions and images were not copied.

## Product Principles

- Keep product specifications and commercial terms traceable to a source and operator-reviewed before publication.
- Treat lens parameters as structured product data rather than descriptive copy.
- Distinguish verified catalog facts from imported, draft, or unknown information.
- Keep checkout unavailable until payment and order-handling behavior is approved and implemented.
