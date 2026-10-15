import { getMagnifierLensCenter, getMagnifierGeometry, formatPinCoordinates } from './magnifierGeometry';

describe('getMagnifierLensCenter', () => {
  it('offsets up and toward the horizontal centre of the image, clamped inside the bounds', () => {
    // Point on the right half of an 862x484 image (mirrors the audit's R-pin drag) — the
    // lens should be pulled left, toward the centre.
    const center = getMagnifierLensCenter({ x: 796, y: 257 }, 862, 484, 60, 90);
    expect(center.x).toBeLessThan(796);
    expect(center.y).toBeLessThan(257);
  });

  it('clamps the centre so the full lens stays inside the image, near a corner', () => {
    const center = getMagnifierLensCenter({ x: 5, y: 5 }, 862, 484, 60, 90);
    expect(center.x).toBeGreaterThanOrEqual(60);
    expect(center.y).toBeGreaterThanOrEqual(60);
  });
});

describe('getMagnifierGeometry', () => {
  it('builds an image crop rect that lands the point exactly at the lens centre, at the given zoom', () => {
    const point = { x: 400, y: 200 };
    const geo = getMagnifierGeometry({
      point,
      imageWidth: 862,
      imageHeight: 484,
      radius: 60,
      zoom: 4,
      distance: 90,
    });
    expect(geo.radius).toBe(60);
    expect(geo.image.width).toBe(862 * 4);
    expect(geo.image.height).toBe(484 * 4);
    expect(geo.image.x).toBe(geo.center.x - point.x * 4);
    expect(geo.image.y).toBe(geo.center.y - point.y * 4);
  });

  it('defaults to radius 60, zoom 4, distance 90', () => {
    const geo = getMagnifierGeometry({ point: { x: 400, y: 200 }, imageWidth: 862, imageHeight: 484 });
    expect(geo.radius).toBe(60);
    expect(geo.image.width).toBe(862 * 4);
  });

  it('uses imagePoint (not point) for the crop offset when they differ', () => {
    const screenPoint = { x: 500, y: 300 }; // e.g. a panned/zoomed screen position
    const imagePoint = { x: 200, y: 150 }; // the same pin's true position in image content
    const geo = getMagnifierGeometry({
      point: screenPoint,
      imagePoint,
      imageWidth: 862,
      imageHeight: 484,
      radius: 60,
      zoom: 4,
    });
    // Crop offset must be derived from imagePoint, not point.
    expect(geo.image.x).toBe(geo.center.x - imagePoint.x * 4);
    expect(geo.image.y).toBe(geo.center.y - imagePoint.y * 4);
    // Lens placement must still be derived from point (screen space).
    const expectedCenter = getMagnifierLensCenter(screenPoint, 862, 484, 60, 90);
    expect(geo.center).toEqual(expectedCenter);
  });

  it('imagePoint defaults to point when omitted (existing single-point callers keep working)', () => {
    const point = { x: 400, y: 200 };
    const withDefault = getMagnifierGeometry({ point, imageWidth: 862, imageHeight: 484 });
    const withExplicit = getMagnifierGeometry({ point, imagePoint: point, imageWidth: 862, imageHeight: 484 });
    expect(withDefault).toEqual(withExplicit);
  });
});

describe('formatPinCoordinates', () => {
  it('formats a zoom-space point back into image-pixel space, one decimal place', () => {
    expect(formatPinCoordinates({ x: 796, y: 257 }, 2.2426)).toBe('x 1785.1 · y 576.3 px');
  });

  it('handles factor 1 (no resize)', () => {
    expect(formatPinCoordinates({ x: 100, y: 50 }, 1)).toBe('x 100.0 · y 50.0 px');
  });
});
