---
name: ISK Lenses
description: A lens-shopping experience with clear sky-blue fields, deep blue actions, and true-to-source product photography.
colors:
  ink-blue: "#15384d"
  sky-blue: "#087ba5"
  deep-blue: "#006f9b"
  light-blue: "#b8e8f5"
  sky-surface: "#e8f6fb"
  cool-paper: "#f7fcff"
  muted-copy: "#526b7b"
  rule: "#cfe2eb"
  input-border: "#b8d4e0"
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
    backgroundColor: "{colors.deep-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-blue}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.pill}"
    padding: "16px 28px"
  input-search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-blue}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.pill}"
    padding: "10px 12px"
  admin-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-blue}"
    borderColor: "{colors.rule}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: ISK Lenses

## Overview

**Creative North Star: "The Clear-Sky Lens Index"**

ISK Lenses pairs the energy of the live site's cyan-blue product banners with a clear, cool-white catalog that keeps real lens photography legible and color-accurate. The shopper-facing site uses a sky-blue announcement strip, deep-blue actions, and product imagery framed by pale blue. Large Outfit headlines and an italic serif accent carry the existing brand voice; product names, prices, options, and availability remain factual and easy to scan. The admin workspace inherits the palette while retaining familiar, task-first operations.

**Core characteristics**
- Cool white surfaces with deep blue structure and clear sky-blue actions.
- Large editorial imagery and expressive type, with restrained supporting copy.
- Product grids use pale sky-blue image wells but never tint the source photography.
- Admin forms and tables keep clear labels, borders, and operational states.

ISK Lenses remains the brand. The public reference informs the blue palette and image treatment only; unverified delivery, certification, clinical, discount, or customer claims are not introduced.

## Color

- **Ink Blue** (`#15384d`) anchors the announcement bar, headlines, and strong controls.
- **Sky Blue** (`#087ba5`) marks large color fields, focus rings, and graphic accents.
- **Deep Blue** (`#006f9b`) marks primary actions and text links; white-on-blue controls retain accessible contrast.
- **Light Blue** (`#b8e8f5`) is reserved for accents on deep surfaces.
- **Sky Surface** (`#e8f6fb`) carries soft fields, selected states, and product-image framing.
- **Cool Paper** (`#f7fcff`) is the page background; white is reserved for fields and work surfaces.
- **Muted Copy** (`#526b7b`) and **Rule** (`#cfe2eb`) provide secondary text and boundaries.
- **Error** (`#b4233e`) and **Rating** (`#b66b24`) are semantic colors, not brand accents.

## Typography

Outfit is used for navigation, body copy, product data, and display type. Display headings use a tight, bold rhythm; the Georgia italic accent is limited to the wordmark and selected hero phrase. Labels remain readable and avoid faux-technical styling.

## Layout and surfaces

The storefront is centered on a wide canvas. A compact deep-blue announcement ribbon leads into the logo, search, account, bag, and category navigation. The homepage opens with an image-led hero and a clear blue catalog action. The lower page varies between open product grids with pale blue photo wells, brand marks, category imagery, customer content, and quieter informational sections.

The catalog, product details, cart, checkout, account, and content pages share the same cool palette, type, input states, and pill-shaped actions. Mobile navigation, filters, forms, and product media wrap or stack without horizontal page overflow. Product images remain sourced from the catalog and are never color-tinted; abstract lens artwork is explicitly labeled when no product photo exists.

The admin area uses the same color identity and rounded work surfaces but keeps dashboard navigation, forms, tables, and feedback states familiar and information-dense.

## Depth and shape

Use thin rules, tonal fields, and open spacing before shadows. Product cards remain visually open; white panels are for grouped tasks, forms, and summaries. Primary and secondary actions are pill-shaped, while larger panels use a restrained radius. Focus rings remain visible in sky blue.

## Components

### Navigation

The announcement strip uses sky blue with light text. The main header stays cool-paper with the wordmark, search, account, and bag actions; category links remain directly available at desktop widths and in the mobile drawer.

### Catalog and product cards

Lead with real catalog photography when available. Keep category, product name, price, option selection, availability, and cart actions legible and in their existing functional order. Do not invent stock, ratings, product claims, or specifications.

### Forms and admin

Inputs use white surfaces, visible rules, readable labels, and strong focus. Admin messages preserve distinct error and informational states. Styling never obscures the state or action.

### Motion and accessibility

Use restrained transitions for controls and carousel movement; honor reduced-motion preferences. Preserve keyboard focus, semantic headings, accessible names, and meaningful image alternatives. Do not turn abstract art into product evidence.

## Do and don't

### Do
- Keep ISK Lenses identity and existing routes, catalog data, and commerce behavior intact.
- Use the same ink-blue, sky-blue, light-blue, and cool-paper roles across storefront and admin.
- Let real product content and images lead.

### Don't
- Copy the reference brand name or repeat its unsupported commercial, medical, certification, or social-proof claims.
- Imply online payment is available or that delivery charges are already included.
- Use the abstract lens illustration as a product photo or specification.
