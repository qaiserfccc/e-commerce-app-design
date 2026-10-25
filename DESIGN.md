---
name: ISK Lenses
description: An editorial lens-shopping experience with a warm porcelain, ink, and rose identity.
colors:
  ink-navy: "#201b35"
  rose: "#d45782"
  rose-deep: "#b83f6b"
  rose-light: "#f3b4c9"
  blush: "#fae9ef"
  warm-paper: "#fffaf8"
  muted-copy: "#686371"
  rule: "#e6dce1"
  input-border: "#d8cbd2"
  error: "#b4233e"
  rating: "#b66b24"
  white: "#ffffff"
typography:
  body:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  display:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 7vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-0.065em"
  accent:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "inherit"
    fontWeight: 400
    fontStyle: italic
  label:
    fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.12em"
rounded:
  pill: "999px"
  sm: "12px"
  md: "16px"
  lg: "32px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.rose-deep}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-navy}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  input-search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-navy}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.pill}"
    padding: "10px 12px"
  admin-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-navy}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: ISK Lenses

## Overview

**Creative North Star: "The Roseglass Edit"**

ISK Lenses pairs the editorial polish of a beauty storefront with the clarity needed to compare real catalog listings. The shopper-facing site uses a dark ink announcement ribbon, a calm porcelain header, rose accents, and open product imagery. Large Outfit headlines and an italic serif accent carry the brand voice; product names, prices, options, and availability remain factual and easy to scan. The admin workspace inherits the same palette and typography while retaining familiar, task-first operations.

**Core characteristics**
- Warm, light surfaces with ink-navy structure and rose-pink actions.
- Large editorial imagery and expressive type, with restrained supporting copy.
- Product grids prioritize photos, names, prices, and real availability over decorative cards.
- Admin forms and tables keep clear labels, borders, and operational states.

The requested reference's name and content are not copied: ISK Lenses remains the brand, and unverified delivery, certification, clinical, discount, or customer claims are not introduced.

## Color

- **Ink Navy** (`#201b35`) anchors the announcement bar, headlines, and strong controls.
- **Rose** (`#d45782`) marks the italic display accent, decorative artwork, and non-text accents.
- **Deep Rose** (`#b83f6b`) marks primary actions and text links; white-on-rose actions retain accessible contrast.
- **Rose Light** (`#f3b4c9`) is reserved for accents on dark surfaces.
- **Blush** (`#fae9ef`) carries large soft fields and selected states.
- **Warm Paper** (`#fffaf8`) is the page background; white is reserved for fields and work surfaces.
- **Muted Copy** (`#686371`) and **Rule** (`#e6dce1`) provide secondary text and boundaries.
- **Error** (`#b4233e`) and **Rating** (`#b66b24`) are semantic colors, not brand accents.

## Typography

Outfit is used for navigation, body copy, product data, and display type. Display headings use a tight, bold rhythm; the Georgia italic accent is limited to the wordmark and selected hero phrase. Labels remain readable and avoid faux-technical styling.

## Layout and surfaces

The storefront is centered on a wide canvas. A compact announcement ribbon leads into the logo, search, account, bag, and category navigation. The homepage opens with a split editorial hero: headline and catalog actions to the left, a real promotional or product image to the right. The lower page varies between open product grids, brand marks, category imagery, customer content, and quieter informational sections.

The catalog, product details, cart, checkout, account, and content pages share the same warm palette, type, input states, and pill-shaped actions. Mobile navigation, filters, forms, and product media wrap or stack without horizontal page overflow. Product images remain sourced from the catalog; abstract lens artwork is explicitly labeled when no product photo exists.

The admin area uses the same color identity and rounded work surfaces but keeps dashboard navigation, forms, tables, and feedback states familiar and information-dense.

## Depth and shape

Use thin rules, tonal fields, and open spacing before shadows. Product cards remain visually open; white panels are for grouped tasks, forms, and summaries. Primary and secondary actions are pill-shaped, while larger panels use a restrained radius. Focus rings remain visible in the rose accent.

## Components

### Navigation

The announcement strip uses ink navy with light text. The main header stays warm-paper with the wordmark, search, account, and bag actions; category links remain directly available at desktop widths and in the mobile drawer.

### Catalog and product cards

Lead with real catalog photography when available. Keep category, product name, price, option selection, availability, and cart actions legible and in their existing functional order. Do not invent stock, ratings, product claims, or specifications.

### Forms and admin

Inputs use white surfaces, visible rules, readable labels, and strong focus. Admin messages preserve distinct error and informational states. Styling never obscures the state or action.

### Motion and accessibility

Use restrained transitions for controls and carousel movement; honor reduced-motion preferences. Preserve keyboard focus, semantic headings, accessible names, and meaningful image alternatives. Do not turn abstract art into product evidence.

## Do and don't

### Do
- Keep ISK Lenses identity and existing routes, catalog data, and commerce behavior intact.
- Use the same ink, rose, blush, and warm-paper roles across storefront and admin.
- Let real product content and images lead.

### Don't
- Copy the reference brand name or repeat its unsupported commercial, medical, certification, or social-proof claims.
- Imply online payment is available or that delivery charges are already included.
- Use the abstract lens illustration as a product photo or specification.
