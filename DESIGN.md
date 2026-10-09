---
name: ISK Lenses
description: A chromatic specimen index for browsing verified contact-lens listings.
colors:
  ink-blue: "#152a52"
  optic-blue: "#16468a"
  signal-chartreuse: "#d3ff48"
  leaf-paper: "#edf4ef"
  mist-green: "#dbe7e1"
  blue-gray: "#314a63"
  sage-line: "#b9c9c6"
  alert-red: "#a52d3c"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Impact, 'Arial Narrow', sans-serif"
    fontSize: "clamp(3.2rem, 8vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.84
    letterSpacing: "-0.035em"
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.14em"
rounded:
  square: "0px"
  sm: "6px"
  md: "12px"
  lg: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink-blue}"
    textColor: "{colors.signal-chartreuse}"
    rounded: "{rounded.square}"
    padding: "16px 20px"
  button-secondary:
    backgroundColor: "{colors.leaf-paper}"
    textColor: "{colors.ink-blue}"
    rounded: "{rounded.square}"
    padding: "12px 16px"
  input-search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-blue}"
    rounded: "{rounded.square}"
    padding: "10px 12px"
  filter-selected:
    backgroundColor: "{colors.ink-blue}"
    textColor: "{colors.signal-chartreuse}"
    rounded: "{rounded.square}"
    padding: "8px 12px"
  admin-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-blue}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: ISK Lenses

## Overview

**Creative North Star: "The Chromatic Specimen Index"**

The storefront treats each published listing as a specimen with inspectable facts, not a beauty promise. A cool, botanical paper field supports deep optical blue and a precise chartreuse signal; compressed display lettering and measurement-like labels make the catalog feel indexed. The admin workspace stays quieter and task-first, using white work surfaces, restrained borders, and familiar controls.

The abstract lens study is a graphic device, never product evidence. Real product media, prices, availability, and lens parameters appear only when operators add and verify them. The same truth-first rule governs empty states, option selectors, and the browse-only bag.

**Key Characteristics:**
- Chromatic fields, not scattered accent decoration
- Specimen-like product listings with factual metadata
- Quiet, readable admin operations
- Explicit separation between abstract illustration and real product media

## Colors

The storefront uses a full palette: optical blue grounds the page, chartreuse indexes actions, and cool greens keep product imagery legible.

### Primary
- **Ink Blue**: The main navigation, hero field, and primary actions.
- **Optic Blue**: Focus rings, links, and selected media states.
- **Signal Chartreuse**: Action text and selected catalog controls against dark blue.

### Secondary
- **Mist Green**: Low-contrast product plates and neutral interactive states.

### Neutral
- **Leaf Paper**: The primary page and product-detail background.
- **Blue Gray**: Secondary copy and data labels on light surfaces.
- **Sage Line**: Dividers and quiet boundaries.
- **White**: Search fields, admin panels, and media thumbnails.
- **Alert Red**: Error and destructive states only.

**The Chromatic Field Rule.** Let large regions carry the palette; do not reduce chartreuse to a handful of unrelated badges.

## Typography

**Display Font:** Impact with Arial Narrow and sans-serif fallbacks
**Body Font:** System sans-serif
**Label/Mono Font:** System monospace

**Character:** Display lettering is compressed and declarative; body copy remains neutral and easy to scan. Monospaced uppercase labels are reserved for measurements, navigation metadata, and compact catalog notation.

### Hierarchy
- **Display** (400, responsive clamp up to 6rem, tight leading): storefront proposition and major section headings.
- **Headline** (400, 3rem–3.75rem, compact leading): product and catalog section titles.
- **Body** (400, 16px, 1.5): descriptions, instructions, and explanatory copy.
- **Label** (700, 10px, tracked uppercase): category, availability, measurements, and navigation metadata.

**The Instrument-Scale Rule.** Use monospace for real catalog measurements or indexing; never as a generic “technical” costume.

## Layout

The storefront uses a wide centered canvas capped at 1500px. Its opening is a two-field composition: proposition and primary action on the left, a large abstract optical study on the right. The listing index moves into an unboxed four-column product grid at large widths and collapses to two columns at the small breakpoint. Product detail places media beside facts on large screens and stacks them on narrow screens.

Navigation and filters wrap rather than forcing horizontal page overflow. The admin workspace prioritizes task grouping, readable rows, and familiar form layouts over the storefront's expressive composition. The spacing rhythm follows a 4px base with 8px increments for common control and section gaps.

## Elevation & Depth

Surfaces are mostly flat. Page-scale color fields, thin rules, and concentric optical geometry establish depth without floating-card shadows. The lens study uses an inset highlight as illustration, not as an elevation cue; admin panels remain clearly bounded by a light background and border.

**The Flat-By-Default Rule.** Use tonal fields and borders for structure; reserve inset light for the abstract optical study.

## Shapes

Storefront controls, filters, product plates, and editorial rules are square-edged. The optical study is defined by concentric circles. Admin work surfaces retain gently rounded container corners so dense operational tasks remain distinct from the storefront's sharper catalog language.

## Components

### Buttons
- **Character:** Direct, high-contrast controls with an unmistakable action.
- **Primary:** Ink-blue field with chartreuse text; square corners and generous vertical padding.
- **Secondary:** Quiet paper or outlined treatment for supporting actions.
- **Hover / Focus:** Blue shifts for hover; a visible optic-blue focus outline remains keyboard-accessible.
- **Disabled:** Reduce contrast and indicate unavailability without hiding the control.

### Chips
- **Style:** Compact uppercase category filters, square-edged and easy to scan.
- **State:** The selected filter reverses to the primary dark field with chartreuse text; unselected filters remain paper-toned or outlined.

### Cards / Containers
- **Storefront:** Product plates remain unboxed; image, category, title, availability, and price align through open spacing and rules.
- **Admin:** White rounded panels group related work and retain clear borders.
- **Media:** Real uploaded media leads; the abstract study is explicitly labeled when no product image exists.

### Inputs / Fields
- **Style:** White fields with a clear border and compact internal padding.
- **Focus:** Strong visible outline, including search and option selection.
- **Error / Disabled:** Errors use the alert role and actionable copy; disabled stock and price fields explain when active variants control them.

### Navigation
- **Style:** Uppercase, strongly weighted links with compact spacing. The storefront navigation wraps on narrow screens; the admin navigation remains a task-first workspace menu.

### Optical Study
- **Signature:** Concentric rings and a crosshair animate as an abstract catalog illustration. Label the study as non-photographic and never imply it depicts a specific lens.

## Do's and Don'ts

### Do:
- **Do** keep product claims and specifications tied to fields actually present in the catalog.
- **Do** preserve visible keyboard focus and clearly named actions.
- **Do** distinguish abstract illustration from product photography.
- **Do** keep admin controls familiar and operationally clear.

### Don't:
- **Don't** use unverified source details as published product claims.
- **Don't** imply the in-page bag can submit an order.
- **Don't** use the optical study as evidence of a real product color or specification.
- **Don't** use chartreuse as body text on light surfaces.
