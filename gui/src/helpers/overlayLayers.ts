export type OverlayLayer = 'section' | 'stivLines' | 'vectors';

/** `null` means "auto": the STIV search lines show until a run has produced
 *  vectors, then step aside so the result reads first. Any click makes it explicit. */
export interface OverlayVisibility {
  section: boolean;
  stivLines: boolean | null;
  vectors: boolean;
}

export const DEFAULT_OVERLAY_VISIBILITY: OverlayVisibility = { section: true, stivLines: null, vectors: true };

export const isOverlayVisible = (v: OverlayVisibility, layer: OverlayLayer, hasVectors: boolean): boolean => {
  if (layer === 'stivLines') return v.stivLines ?? !hasVectors;
  return v[layer];
};

export const availableOverlayLayers = ({
  hasStations,
  hasVectors,
}: {
  hasStations: boolean;
  hasVectors: boolean;
}): OverlayLayer[] => {
  const layers: OverlayLayer[] = ['section'];
  if (hasStations) layers.push('stivLines');
  if (hasVectors) layers.push('vectors');
  return layers;
};
