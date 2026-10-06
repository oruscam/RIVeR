import { regionToolbarPlacement } from './regionToolbarPlacement';

// A 1000×500 video shown in a 500×250 box: 2 video px per CSS px.
const base = {
  videoWidth: 1000,
  videoHeight: 500,
  boxWidth: 500,
  boxHeight: 250,
  scale: 1,
  position: { x: 0, y: 0 },
  toolbar: { width: 64, height: 32 },
};

describe('regionToolbarPlacement', () => {
  it('centres the toolbar under the region, 10px below its bottom edge', () => {
    const { left, top } = regionToolbarPlacement({ ...base, region: { x: 200, y: 100, width: 200, height: 100 } });
    expect(left).toBe(150 - 32);
    expect(top).toBe(100 + 10);
  });

  it('goes above the region when there is no room under it', () => {
    const { top } = regionToolbarPlacement({ ...base, region: { x: 200, y: 300, width: 200, height: 180 } });
    expect(top).toBe(150 - 10 - 32);
  });

  it('goes inside the region when there is room on neither side', () => {
    const { top } = regionToolbarPlacement({ ...base, region: { x: 0, y: 10, width: 400, height: 480 } });
    expect(top).toBe(245 - 10 - 32);
  });

  it('stays inside the box horizontally', () => {
    expect(regionToolbarPlacement({ ...base, region: { x: 0, y: 0, width: 20, height: 20 } }).left).toBe(8);
    expect(regionToolbarPlacement({ ...base, region: { x: 980, y: 0, width: 20, height: 20 } }).left).toBe(
      500 - 8 - 64
    );
  });

  it('keeps a constant on-screen size and gap when zoomed', () => {
    // Zoom 2 about the centre, no pan: the visible local area is [125, 375] × [62.5, 187.5].
    const { left, top } = regionToolbarPlacement({
      ...base,
      scale: 2,
      region: { x: 400, y: 200, width: 200, height: 50 },
    });
    expect(left).toBe(250 - 16);
    expect(top).toBe(125 + 5);
  });

  it('follows the pan: a region off the visible bottom puts its toolbar at the visible bottom edge', () => {
    // Zoom 2, no pan: the region's bottom (local 225) is below the visible bottom (187.5).
    const { top } = regionToolbarPlacement({
      ...base,
      scale: 2,
      region: { x: 400, y: 100, width: 200, height: 350 },
    });
    expect(top).toBe(187.5 - 5 - 16);
  });
});
