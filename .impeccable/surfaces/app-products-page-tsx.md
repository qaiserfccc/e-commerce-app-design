---
version: 1
slug: "app-products-page-tsx"
primary_target: "app/products/page.tsx"
related_targets: ["components/storefront/product-index.tsx", "app/api/products/route.ts", "components/storefront/product-detail.tsx"]
---

## Scope and visitor mode
The `/products` page is a browse-and-compare surface for the complete published catalog.

## Audience and task
Shoppers scan listings, filter by recorded collection, search, and open a product or a specific listed option.

## Proof and constraints
Render every active database listing and actual media/options only. Prefer uploaded product media, then display validated image URLs from `isklenses.com` directly on cards and in the product gallery; do not copy source files to Blob or present them as uploaded media. No option rows or clinical details may be invented. Checkout remains unavailable.

## Direction and memorable moment
Extend the Chromatic Specimen Index into a full navigable catalog: a compact index masthead, category rail, and open specimen entries with per-listing option links when options exist.

## Unresolved decisions
No source variations have been configured. The operator must verify prescription/fit options and source-image usage rights before relying on those details or authorizing media rehosting.
