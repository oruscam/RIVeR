export type OverlayLayer = 'stivLines' | 'vectors';

/** `null` means "auto": the STIV search lines show until a run has produced
 *  vectors, then step aside so the result reads first. Any click makes it explicit. */
export interface OverlayVisibility {
  stivLines: boolean | null;
  vectors: boolean;
}

export const DEFAULT_OVERLAY_VISIBILITY: OverlayVisibility = { stivLines: null, vectors: true };

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
  const layers: OverlayLayer[] = [];
  if (hasStations) layers.push('stivLines');
  if (hasVectors) layers.push('vectors');
  return layers;
};
