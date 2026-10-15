import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { OverlayLayers } from './OverlaySvg';
import {
  OverlayLayer,
  OverlayVisibility,
  availableOverlayLayers,
  isOverlayVisible,
} from '../helpers/overlayLayers';

const LABELS: Record<OverlayLayer, { key: string; text: string; dot: string }> = {
  stivLines: { key: 'Processing.layerStivLines', text: 'STIV lines', dot: 'var(--tech-stiv)' },
  vectors: { key: 'Processing.layerVectors', text: 'Vectors', dot: 'var(--tech-lspiv)' },
};

/**
 * Show/hide for what the Frames canvas draws over the footage. A chip appears
 * only for a layer that exists, and none when neither does. Quiet toggles on the same translucent chrome
 * as the Frames / Space-time / Spectrum switch; a dimmed chip is hidden.
 */
export const OverlayLayersControl = ({
  visibility,
  hasStations,
  hasVectors,
  onSetVisible,
}: {
  visibility: OverlayVisibility;
  hasStations: boolean;
  hasVectors: boolean;
  onSetVisible: (layer: OverlayLayer, visible: boolean) => void;
}) => {
  const { t } = useTranslation();
  const layers = availableOverlayLayers({ hasStations, hasVectors });
  if (layers.length === 0) return null;

  return (
    <div
      className="overlay-layers"
      role="group"
      aria-label={t('Processing.layersLabel', { defaultValue: 'Layers' })}
    >
      {layers.map((layer) => {
        const on = isOverlayVisible(visibility, layer, hasVectors);
        const { key, text, dot } = LABELS[layer];
        return (
          <button
            key={layer}
            type="button"
            className="overlay-layer"
            aria-pressed={on}
            onClick={() => onSetVisible(layer, !on)}
          >
            <span className="overlay-layer-dot" style={{ background: dot }} />
            {t(key, { defaultValue: text })}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Applies the toggles to the overlay's layer groups. The d3 children stay
 * mounted (they draw into these groups and do not clean up on unmount), so a
 * hidden layer is display:none rather than removed. The section is never hidden. STIV lines in the station group; vectors in
 * the quiver group. Runs after every render because OverlaySvg rebuilds its
 * groups when the canvas is resized.
 */
export const OverlayLayerVisibility = ({
  layers,
  visibility,
  hasVectors,
}: {
  layers: OverlayLayers;
  visibility: OverlayVisibility;
  hasVectors: boolean;
}) => {
  useEffect(() => {
    const set = (refs: Array<React.RefObject<SVGGElement>>, layer: OverlayLayer) => {
      const display = isOverlayVisible(visibility, layer, hasVectors) ? null : 'none';
      refs.forEach((ref) => ref.current?.style.setProperty('display', display));
    };
    set([layers.stationLayerRef], 'stivLines');
    set([layers.quiverLayerRef], 'vectors');
  });
  return null;
};
