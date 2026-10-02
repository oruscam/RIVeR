import { readFileSync } from 'fs';
import { join } from 'path';
import { availableOverlayLayers, isOverlayVisible, DEFAULT_OVERLAY_VISIBILITY } from './overlayLayers';
import reducer, { setOverlayVisible } from '../store/ui/uiSlice';
import { UIState } from '../store/ui/types';

describe('overlay layer visibility (default A)', () => {
  const v = DEFAULT_OVERLAY_VISIBILITY;
  test('before a run: the station lines show', () => {
    expect(isOverlayVisible(v, 'stivLines', false)).toBe(true);
  });
  test('once vectors exist the STIV lines hide by default and vectors show', () => {
    expect(isOverlayVisible(v, 'stivLines', true)).toBe(false);
    expect(isOverlayVisible(v, 'vectors', true)).toBe(true);
  });
  test('an explicit choice beats the default', () => {
    expect(isOverlayVisible({ ...v, stivLines: true }, 'stivLines', true)).toBe(true);
    expect(isOverlayVisible({ ...v, stivLines: false }, 'stivLines', false)).toBe(false);
    expect(isOverlayVisible({ ...v, vectors: false }, 'vectors', true)).toBe(false);
  });
});

describe('available chips', () => {
  test('no chips when nothing else exists', () => {
    expect(availableOverlayLayers({ hasStations: false, hasVectors: false })).toEqual([]);
  });
  test('stations add STIV lines, a run adds vectors', () => {
    expect(availableOverlayLayers({ hasStations: true, hasVectors: false })).toEqual(['stivLines']);
    expect(availableOverlayLayers({ hasStations: true, hasVectors: true })).toEqual(['stivLines', 'vectors']);
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
    expect(ctl).not.toMatch(/staticLayerRef|interactiveLayerRef|uiLayerRef/); // the section is never hidden
    expect(ctl).toMatch(/stationLayerRef\], 'stivLines'/);
    expect(ctl).toMatch(/quiverLayerRef\], 'vectors'/);
    expect(ctl).toContain("'display'");
  });
});

describe('hasVectors is about results, not the frame on screen', () => {
  const src = readFileSync(join(__dirname, '../components/ImageProcessing.tsx'), 'utf8');
  test('derived from the stored quivers, not from the per-frame data length', () => {
    expect(src).toMatch(/const hasVectors = fullQuiver !== null \|\| quiver !== null/);
    expect(src).not.toMatch(/hasVectors = data\.length/);
  });
});

describe('station number labels', () => {
  const src = readFileSync(join(__dirname, '../components/StationSearchLines.tsx'), 'utf8');
  test('sit at the origin end of each search line, not the far end', () => {
    const labels = src.slice(
      src.indexOf("attr('class', 'station-search-label')"),
      src.indexOf('labelGroups.each')
    );
    expect(labels).toContain('d.a.x / factor');
    expect(labels).not.toMatch(/translate\(\$\{d\.b\.x/);
  });
});
