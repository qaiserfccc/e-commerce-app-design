---
version: 1
slug: "app-checkout-page-tsx"
primary_target: "app/checkout/page.tsx"
related_targets: ["components/storefront/checkout.tsx","app/checkout/confirmation/page.tsx"]
---

## Scope and visitor mode
The `/checkout` flow records a cash-on-delivery purchase; it is an Operate surface, not an online-payment funnel.

## Audience and task
Shoppers in Pakistan review their bag, choose guest checkout or use an account, enter delivery details, review the configured delivery fee and cash-on-delivery total, and place one order.

## Proof and constraints
Reprice active database products and options on submission, calculate delivery from admin-managed rules, verify the displayed delivery quote, reserve stock transactionally, and create an idempotent pending COD order. Collect no online payment. Do not invent tax, shipping, product, or medical claims. Accounts do not verify email, reset passwords, or expose order history.

## Direction and memorable moment
Extend the ISK Lenses Chromatic Specimen Index into a departure docket: ruled checkout masthead, address form, and a persistent itemized ledger with the configured delivery charge and final COD amount.

## Unresolved decisions
Apply migration 0015 to each target database and configure delivery pricing in Admin before enabling checkout. Configure distributed edge rate limiting before production exposure.
