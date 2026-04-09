# Station Number Stepper — Design Spec

**Date:** 2026-04-09
**Status:** Approved

## Summary

Move the Station Number input in the Results module to appear below Alpha and above the plots, and add ghost-style `−` / `+` buttons so users can increment/decrement the value without typing.

## Current State

In `FormResults.tsx`, the layout order is:

1. Result info (total_Q, measured/interpolated %)
2. Alpha input row
3. Plots (`all-in-one-container`, 720 px tall)
4. Station Number input (`switch-container-results`)
5. Artificial Seeding toggle

## Target State

1. Result info
2. Alpha input row
3. **Station Number stepper row** ← moved here
4. Plots
5. Artificial Seeding toggle

## Station Number Stepper Design (Option C — Ghost buttons)

Layout: `[label pill] [ghost −] [number input] [ghost +]`

Uses the same `input-container-2` wrapper as the Alpha row for consistent horizontal alignment.

**Ghost button specs:**
- Size: 26 × 26 px, border-radius 50%
- Border: `1px solid #444` (uses `--border-color` / `--secondary-input-background` variable)
- Background: transparent
- Color: `--secondary-text-color` (#797979)
- Hover: background `--input-background`, color `--primary-text-color`, border `--primary-text-color`
- Transition: `all 0.15s ease`

**Button behavior:**
- `−` decrements numStations by 1, minimum value 3 (calls `onUpdateSection` + `setValue`)
- `+` increments numStations by 1, no maximum (calls `onUpdateSection` + `setValue`)
- Both buttons are disabled when `isBackendWorking` is true (inherited from form `.disabled` class)

**Number input:** keeps existing `input-field-little` style and `handleOnChangeInput` handler (Enter/blur still work for direct typing).

## Files Changed

- `gui/src/components/Forms/FormResults.tsx` — reorder JSX, add stepper handler, add ghost button markup
- `gui/src/components/Forms/form.css` — add `.btn-step` class for ghost button styles

## Out of Scope

- No changes to validation logic (minimum 3 is already enforced)
- No changes to the Artificial Seeding toggle
- No changes to the plots or Grid components
