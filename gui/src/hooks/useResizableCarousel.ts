import { useState, useRef, useCallback, useEffect } from 'react';

interface Options {
  storageKey: string;
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
  /**
   * Called on every mousemove during drag with the live height value.
   * When provided, React state is NOT updated during the drag — only on mouseup.
   * This lets callers update the DOM directly (e.g. CSS variables) without
   * triggering any React re-renders while dragging.
   */
  onDragProgress?: (height: number) => void;
}

interface Result {
  height: number;
  onDragHandleMouseDown: (e: React.MouseEvent) => void;
}

export const useResizableCarousel = ({
  storageKey,
  defaultHeight,
  minHeight,
  maxHeight,
  onDragProgress,
}: Options): Result => {
  const stored = localStorage.getItem(storageKey);
  const initial = stored ? Math.min(maxHeight, Math.max(minHeight, Number(stored))) : defaultHeight;

  const [height, setHeight] = useState(initial);
  const heightRef = useRef(initial);
  const hasUserOverride = useRef(!!stored);
  // Always points to the latest onDragProgress without adding it to useCallback deps.
  const onDragProgressRef = useRef(onDragProgress);
  onDragProgressRef.current = onDragProgress;

  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  useEffect(() => {
    if (!hasUserOverride.current) {
      setHeight(defaultHeight);
      heightRef.current = defaultHeight;
    }
  }, [defaultHeight]);

  const onDragHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = heightRef.current;

      const onMouseMove = (ev: MouseEvent) => {
        const delta = startY - ev.clientY;
        const next = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));
        heightRef.current = next;
        if (onDragProgressRef.current) {
          // Direct DOM update — zero React re-renders during drag.
          onDragProgressRef.current(next);
        } else {
          setHeight(next);
        }
      };

      const onMouseUp = () => {
        // Sync React state once at the end so stored height and derived values update.
        setHeight(heightRef.current);
        localStorage.setItem(storageKey, String(heightRef.current));
        hasUserOverride.current = true;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [storageKey, minHeight, maxHeight]
  );

  return { height, onDragHandleMouseDown };
};
