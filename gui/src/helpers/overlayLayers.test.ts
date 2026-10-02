import { readFileSync } from 'fs';
import { join } from 'path';
import { availableOverlayLayers, isOverlayVisible, DEFAULT_OVERLAY_VISIBILITY } from './overlayLayers';
import reducer, { setOverlayVisible } from '../store/ui/uiSlice';
import { UIState } from '../store/ui/types';

describe('overlay layer visibility (default A)', () => {
  const v = DEFAULT_OVERLAY_VISIBILITY;
  test('before a run: section and the station lines show', () => {
    expect(isOverlayVisible(v, 'section', false)).toBe(true);
    expect(isOverlayVisible(v, 'stivLines', false)).toBe(true);
  });
  test('once vectors exist the STIV lines hide by default, section and vectors show', () => {
    expect(isOverlayVisible(v, 'stivLines', true)).toBe(false);
    expect(isOverlayVisible(v, 'vectors', true)).toBe(true);
    expect(isOverlayVisible(v, 'section', true)).toBe(true);
  });
  test('an explicit choice beats the default', () => {
    expect(isOverlayVisible({ ...v, stivLines: true }, 'stivLines', true)).toBe(true);
    expect(isOverlayVisible({ ...v, stivLines: false }, 'stivLines', false)).toBe(false);
    expect(isOverlayVisible({ ...v, vectors: false }, 'vectors', true)).toBe(false);
  });
});

describe('available chips', () => {
  test('section only when nothing else exists', () => {
    expect(availableOverlayLayers({ hasStations: false, hasVectors: false })).toEqual(['section']);
  });
  test('stations add STIV lines, a run adds vectors', () => {
    expect(availableOverlayLayers({ hasStations: true, hasVectors: false })).toEqual(['section', 'stivLines']);
    expect(availableOverlayLayers({ hasStations: true, hasVectors: true })).toEqual([
      'section',
      'stivLines',
      'vectors',
    ]);
  });
});

describe('uiSlice overlayVisibility', () => {
  const base = { overlayVisibility: DEFAULT_OVERLAY_VISIBILITY } as UIState;
  test('setOverlayVisible writes one layer and leaves the others', () => {
    const s = reducer(base, setOverlayVisible({ layer: 'vectors', visible: false }));
    expect(s.overlayVisibility).toEqual({ ...DEFAULT_OVERLAY_VISIBILITY, vectors: false });
  });
});

describe('Frames canvas wiring', () => {
  const src = readFileSync(join(__dirname, '../components/ImageProcessing.tsx'), 'utf8');
  const ctl = readFileSync(join(__dirname, '../components/OverlayLayersControl.tsx'), 'utf8');
  test('the chips and the visibility applier are rendered on the Frames canvas', () => {
    expect(src).toContain('<OverlayLayersControl');
    expect(src).toContain('<OverlayLayerVisibility');
  });
  test('each layer maps to its own d3 groups and stays mounted (display, not unmount)', () => {
    expect(ctl).toMatch(/staticLayerRef, layers\.interactiveLayerRef, layers\.uiLayerRef\], 'section'/);
    expect(ctl).toMatch(/stationLayerRef\], 'stivLines'/);
    expect(ctl).toMatch(/quiverLayerRef\], 'vectors'/);
    expect(ctl).toContain("'display'");
  });
});
