import { useEffect, useState } from 'react';
import { getSpectrumRamp } from '../helpers/getCSSVar';
import { buildRampLut, isGreyImage, recolourGreyPixels } from '../helpers/fieldImage';
import { parseColor } from '../helpers/spectrumGeometry';
import type { RgbColor } from '../helpers/spectrumGeometry';
import { useUiSlice } from './useUiSlice';

// The dark theme's ramp, wherever a token fails to parse.
const FALLBACK_RAMP: RgbColor[] = [
  [10, 13, 18],
  [46, 125, 214],
  [169, 220, 255],
];

/**
 * The URL to show for a scalar-field image the backend wrote in grey (the
 * stabilization check, the calibration coverage heatmap): the same picture
 * painted with the active theme's ramp, the one the iWave spectrum uses.
 *
 * Undefined while the picture is being painted. An image that already carries
 * colours (written by an older RIVeR) or that cannot be read comes back as it
 * is, so the view is never empty because of the recolouring.
 */
export const useFieldImage = (src: string | undefined): string | undefined => {
  const { theme } = useUiSlice();
  const [painted, setPainted] = useState<{ src: string; url: string } | null>(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    const show = (url: string) => {
      if (!cancelled) setPainted({ src, url });
    };

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) return show(src);
        context.drawImage(img, 0, 0);
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        if (!isGreyImage(image.data)) return show(src);
        const ramp = getSpectrumRamp().map((color, i) => parseColor(color) ?? FALLBACK_RAMP[i]);
        recolourGreyPixels(image.data, buildRampLut(ramp));
        context.putImageData(image, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return show(src);
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          show(objectUrl);
        });
      } catch {
        show(src);
      }
    };
    img.onerror = () => show(src);
    img.src = src;

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, theme]);

  return src && painted?.src === src ? painted.url : undefined;
};
