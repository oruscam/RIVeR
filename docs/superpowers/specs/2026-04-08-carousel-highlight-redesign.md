# Carousel Highlight Redesign

**Date:** 2026-04-08  
**Module:** Processing — image carousel  
**Scope:** CSS-only change, no React modifications

## Problem

The currently selected image pair (A and B) in the Processing carousel are highlighted with two different hardcoded colors: white for Image A and cyan (`#6CD4FF`) for Image B. This ignores the active theme and creates an inconsistent visual identity. Unselected images have no visual de-emphasis, making the selected pair harder to spot at a glance.

## Design

### Border color

Both `.img-carousel-active` (Image A) and `.img-carousel-second` (Image B) get the same border: `4px solid var(--accent-color)`.

The `--accent-color` CSS variable is already defined per theme:

| Theme   | Color     | Value     |
|---------|-----------|-----------|
| Dark    | Blue      | `#0678BE` |
| Light   | Orange    | `#CC7741` |
| Dracula | Violet    | `#bd93f9` |

No new color variables are needed.

### Dimming unselected images

The base `.img-carousel` class gets `filter: brightness(0.42)` by default. The selected classes (`.img-carousel-active`, `.img-carousel-second`) override this back to `filter: brightness(1)`.

This makes the selected pair visually pop without changing layout or size.

## Changes

**File:** `gui/src/components/components.css`

```css
/* Before */
.img-carousel-active {
    border: 4px solid var(--primary-text-color);
}
.img-carousel-second {
    border: 4px solid #6CD4FF;
}
.img-carousel {
    width: 98%;
    height: auto;
    border-radius: 20px;
    z-index: 1;
}

/* After */
.img-carousel-active {
    border: 4px solid var(--accent-color);
    filter: brightness(1);
}
.img-carousel-second {
    border: 4px solid var(--accent-color);
    filter: brightness(1);
}
.img-carousel {
    width: 98%;
    height: auto;
    border-radius: 20px;
    z-index: 1;
    filter: brightness(0.42);
}
```

## Non-goals

- No visual distinction between A and B (position in the strip is sufficient)
- No changes to carousel behavior, React components, or other modules
