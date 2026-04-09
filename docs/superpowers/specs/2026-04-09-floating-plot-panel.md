# Floating Draggable Plot Panel

**Date:** 2026-04-09  
**Module:** Processing  
**Scope:** 5 files modified, 1 new file created

## Problem

The U vs V scatter plot currently lives inside `HardModeProcessing` (form panel). Moving it below the carousel was rejected — it doesn't feel native to the software. The right solution is a small floating panel overlaid on the image, draggable so it never obscures PIV results, styled consistently with the active theme.

## Design

### FloatingPlot component

New file: `gui/src/components/FloatingPlot.tsx`

A wrapper around `<TestPlot>` that handles:

**Positioning**
- Absolutely positioned inside `ImageProcessing`'s image container
- Initial position: bottom-right corner with 12px margin
- Constrained to image bounds (cannot be dragged outside the image)
- Position persists in `useState` for the session; resets to bottom-right when hard mode is toggled off (the component unmounts and remounts)

**Drag behaviour**
- The entire panel is draggable (cursor: grab / grabbing)
- Closure-based mouse events on `window` — no extra library needed:
  ```ts
  const handleMouseDown = (e) => {
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;
    const onMove = (e) => setPosition({ x: clamp(e.clientX - startX), y: clamp(e.clientY - startY) });
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  ```

**Styling**
- Background: `--card-surface` hex parsed to `rgba` at 88% opacity (read via `getCSSVar`)
- Border: `1px solid <accent-color>` at 50% opacity (append `80` to hex)
- Border-radius: 10px
- Box-shadow: `0 4px 20px rgba(0,0,0,0.4)`
- No title bar — minimal, the grab cursor communicates draggability

**Props**
```ts
interface FloatingPlotProps {
  showMedian: boolean;
  containerWidth: number;
  containerHeight: number;
}
```

### TestPlot — optional width prop

Add optional `width?: number` prop. When provided, use it directly as `graphWidth` (bypassing the screen-proportion logic). When absent, existing behaviour is unchanged.

The floating panel passes `width={180}`. `180 * 0.8 = 144px` height — compact and readable.

### ImageProcessing — accept extraFields + showMedian

Add `extraFields: boolean` and `showMedian: boolean` to `ImageProcessing` props. When `extraFields` is true and quiver data exists, render `<FloatingPlot>` inside the image container (absolute positioning already works there — `ExportMp4` button uses the same pattern).

### Processing — pass new props to ImageProcessing

Pass `extraFields` and `showMedian` to `<ImageProcessing>`.

### HardModeProcessing — remove TestPlot

Remove `TestPlot` import, render, the `quiver` destructure, and the `showMedian` prop from both `HardModeProcessing` and its call site in `FormProcessing`.

## Files

| File | Change |
|---|---|
| `gui/src/components/FloatingPlot.tsx` | **New** — draggable wrapper |
| `gui/src/components/Graphs/TestPlot.tsx` | Add optional `width` prop |
| `gui/src/components/ImageProcessing.tsx` | Add `extraFields`/`showMedian` props, render `FloatingPlot` |
| `gui/src/pages/Processing.tsx` | Pass `extraFields`/`showMedian` to `ImageProcessing` |
| `gui/src/components/Forms/Components/HardModeProcessing.tsx` | Remove TestPlot |
| `gui/src/components/Forms/FormProcessing.tsx` | Remove `showMedian` forwarded to HardModeProcessing |

## Non-goals

- No persistence across sessions (localStorage) — session memory only
- No collapse/close button on the panel
- No changes to other modules (Analyze, Ipcam)
