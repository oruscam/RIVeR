# U vs V Plot — Theme Colors & Placement

**Date:** 2026-04-08  
**Module:** Processing  
**Scope:** 4 files, no new files created

## Problem

The U vs V scatter plot (`TestPlot`) has two issues:

1. **Hardcoded colors** — dots use `COLORS.BLUE_WITH_TRANSPARENCY` (#0678BE95), contour lines, axis labels, and tooltip text use `'white'`. These ignore the active theme and look broken on the light and dracula themes.

2. **Wrong placement** — the plot lives inside `HardModeProcessing` (form panel), which is semantically wrong. Diagnostic chart data belongs near the image, not in the controls panel. It also pushes all controls downward.

## Design

### 1. Theme-aware colors

`testPlotSvg.ts` receives two new parameters: `accentColor` (string) and `textColor` (string). All hardcoded color values are replaced:

| Element | Before | After |
|---|---|---|
| Scatter dots fill | `COLORS.BLUE_WITH_TRANSPARENCY` | `accentColor` + `95` suffix (hex transparency) |
| Scatter dots on mouseout | `COLORS.BLUE` | `accentColor` |
| Density contour stroke | `'white'` | `textColor` |
| X axis label (U) | `'white'` | `textColor` |
| Y axis label (V) | `'white'` | `textColor` |
| Tooltip text (u value) | `'white'` | `textColor` |
| Tooltip text (v value) | `'white'` | `textColor` |

`TestPlot.tsx` reads both CSS variables at render time:
```ts
const accentColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--accent-color').trim();
const textColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--primary-text-color').trim();
```

These are passed to `testPlotSvg` on every render (the `useEffect` dependency array already covers theme changes because quiver/active/showMedian changes trigger re-renders).

### 2. Placement — below carousel in media panel

`TestPlot` is removed from `HardModeProcessing.tsx` and placed in `Processing.tsx`, below `<Carousel>`, inside `media-container`. It renders only when `extraFields === true` (hard mode active) and `quiver !== null`.

```tsx
{extraFields && quiver && <TestPlot showMedian={showMedian && quiver.test === false} />}
```

`quiver` is already available in `Processing.tsx` via `useDataSlice`.

### 3. Visibility rule

Unchanged from current behavior: plot is only visible when hard mode (lock button) is engaged. The difference is it now appears in the media panel (left side), below the carousel, rather than at the top of the form panel (right side).

## Files Changed

| File | Change |
|---|---|
| `gui/src/components/Graphs/testPlotSvg.ts` | Add `accentColor`, `textColor` params; replace hardcoded colors |
| `gui/src/components/Graphs/TestPlot.tsx` | Read CSS vars, pass to `testPlotSvg` |
| `gui/src/components/Forms/Components/HardModeProcessing.tsx` | Remove `<TestPlot>` and its import |
| `gui/src/pages/Processing.tsx` | Import `TestPlot`, render below `<Carousel>` when hard mode + quiver |

## Non-goals

- No changes to plot dimensions, axes, or data logic
- No changes to when hard mode is activated
- No changes to other modules (Analyze, Ipcam)
