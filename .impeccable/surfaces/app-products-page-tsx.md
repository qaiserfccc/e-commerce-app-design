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
Render every active database listing and actual media/options only. Product photography must be copied from approved ISK Lenses source-image paths into Vercel Blob and served only from stored Blob URLs; never hotlink source URLs in the public storefront. Category names, IDs, and parent relationships come from the source WooCommerce taxonomy. No option rows or clinical details may be invented.

## Direction and memorable moment
Extend the specimen index with a skyglass palette: deep optical navy, sky-blue action/selection, and ice-blue page fields. The memorable moment is a compact three-level category console that follows the source site's actual parent-child taxonomy and filters the live catalog at every level.

## Unresolved decisions
No source variations have been configured. Source-image rights must be confirmed by the operator; this change follows the operator's explicit direction to copy the source images to the project's Blob storage.
