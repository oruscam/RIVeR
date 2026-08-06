import { useLayoutEffect, useRef } from 'react';

interface Options {
  min?: number;
  step?: number;
}

// Shared, lazily-created off-DOM canvas used purely for text measurement —
// one instance is enough for every element using this hook, since only
// `ctx.font` needs to change between calls.
let measureCanvas: HTMLCanvasElement | null = null;

const measureTextWidth = (text: string, font: string): number => {
  measureCanvas ??= document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
};

/**
 * Shrinks an element's font-size only as far as needed to stop its text from
 * overflowing (nowrap + ellipsis), starting from whatever size the CSS
 * already gives it. Text that already fits — e.g. a shorter translation —
 * keeps its original size untouched.
 *
 * Measures via Canvas 2D's `measureText` rather than the element's own
 * `scrollWidth`/`clientWidth`: `scrollWidth` on a flex item combining
 * `overflow: hidden` + `white-space: nowrap` + `text-overflow: ellipsis` can
 * come back clamped to `clientWidth` — silently under-reporting the real
 * overflow, so the shrink loop below concludes "fits" when it doesn't.
 * `clientWidth` itself checks out fine; only `scrollWidth` was ever wrong.
 * Measuring the text directly against the font sidesteps that element's
 * layout box entirely.
 */
export const useAutoShrinkFont = <T extends HTMLElement>(
  deps: unknown[],
  { min = 10, step = 1 }: Options = {}
) => {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.fontSize = '';
      const style = window.getComputedStyle(el);
      let fontSize = parseFloat(style.fontSize);
      const text = el.textContent ?? '';
      const availableWidth = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const fontAt = (size: number) => `${style.fontStyle} ${style.fontWeight} ${size}px ${style.fontFamily}`;

      while (measureTextWidth(text, fontAt(fontSize)) > availableWidth && fontSize > min) {
        fontSize -= step;
        el.style.fontSize = `${fontSize}px`;
      }
    };

    fit();

    // The Inter web font can still be loading on first mount — measuring
    // against the fallback font's (usually narrower) metrics can under-count
    // the overflow. The element's own box doesn't change size once the font
    // swaps in, so ResizeObserver won't catch it; re-fit explicitly once
    // fonts are actually ready.
    document.fonts?.ready.then(fit);

    // Belt-and-suspenders: re-check one frame after commit, in case this
    // element's final layout (e.g. a still-settling flex ancestor) isn't
    // resolved yet at the exact moment useLayoutEffect runs.
    const raf = requestAnimationFrame(fit);

    const observer = new ResizeObserver(fit);
    observer.observe(el);

    // .read-only's font-size is a `vw`-based clamp, tied to the *viewport*
    // width — not this element's own box. When the element's box is already
    // pinned at its max-width, growing the window can still grow the font
    // past what fits, with no change to the element's own box for the
    // ResizeObserver above to notice. We need a signal for "viewport changed
    // size" instead — but the DOM `resize` event is unreliable in Electron on
    // macOS for a native maximize ("zoom"/green button): it doesn't fire, or
    // fires before the animated resize has actually settled. A ResizeObserver
    // on the root element isn't tied to that event at all — it reports the
    // real box size whenever it actually changes, regardless of how the
    // resize happened.
    const viewportObserver = new ResizeObserver(fit);
    viewportObserver.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      viewportObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
};
