import type { MaskRaster } from './maskCoverage';

const cache = new Map<string, Promise<MaskRaster | null>>();

/**
 * Reads the Processing mask PNG into a MaskRaster (only the latest is cached). Resolves null (never rejects)
 * when there is no mask yet or the image can't be read, so a preview just shows
 * nothing masked.
 */
export const loadMaskRaster = (src: string): Promise<MaskRaster | null> => {
  if (!src) return Promise.resolve(null);
  const cached = cache.get(src);
  if (cached) return cached;
  const promise = new Promise<MaskRaster | null>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const alpha = new Uint8Array(canvas.width * canvas.height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
        resolve({ width: canvas.width, height: canvas.height, alpha });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  // Each mask rebuild has a new URL; keep only the latest raster.
  cache.clear();
  cache.set(src, promise);
  return promise;
};
