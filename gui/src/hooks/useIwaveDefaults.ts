import { useEffect, useState } from 'react';
import { IWAVE_FALLBACK_DEFAULTS, type IwaveDefaults } from '../../commons/iwave';

/**
 * Automatic iWave values for the Processing screen. Re-fetched on mount, after each analysis
 * (fullQuiver changes, so smax/flow type become LSPIV/STIV-based) and after the ROI height
 * changes the mask/bbox. Skipped while the backend is busy. Any failure keeps the static
 * fallbacks, so the panel always has values to show.
 */
export const useIwaveDefaults = ({
  fullQuiver,
  heightRoi,
  enabled,
}: {
  fullQuiver: unknown;
  heightRoi: number;
  enabled: boolean;
}): IwaveDefaults => {
  const [defaults, setDefaults] = useState<IwaveDefaults>(IWAVE_FALLBACK_DEFAULTS);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    window.ipcRenderer
      .invoke('get-iwave-defaults')
      .then((result: IwaveDefaults | null) => {
        if (!cancelled) setDefaults(result ?? IWAVE_FALLBACK_DEFAULTS);
      })
      .catch(() => {
        if (!cancelled) setDefaults(IWAVE_FALLBACK_DEFAULTS);
      });
    return () => {
      cancelled = true;
    };
  }, [fullQuiver, heightRoi, enabled]);

  return defaults;
};
