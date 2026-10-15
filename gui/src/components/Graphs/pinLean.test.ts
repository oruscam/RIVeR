import { pinLeanAngle, visibleImageBounds } from './pinLean';

const B = { x: 0, y: 0, width: 400, height: 300 };

describe('pinLeanAngle', () => {
  test('upright without bounds, or when the head fits', () => {
    expect(pinLeanAngle({ x: 100, y: 5 })).toBe(0);
    expect(pinLeanAngle({ x: 100, y: 100 }, 1, B)).toBe(0);
    expect(pinLeanAngle({ x: 100, y: 48 }, 1, B)).toBe(0); // head top = 48 - 34 - 12 = 2 = margin
  });

  test('just below the top edge: the smallest lean that fits', () => {
    expect(pinLeanAngle({ x: 100, y: 46 }, 1, B)).toBe(20);
  });

  test('at the top edge it leans toward the centre side', () => {
    expect(pinLeanAngle({ x: 100, y: 5 }, 1, B)).toBe(106);
    expect(pinLeanAngle({ x: 300, y: 5 }, 1, B)).toBe(-106);
  });

  test('side edges and a corner', () => {
    expect(pinLeanAngle({ x: 5, y: 150 }, 1, B)).toBe(16);
    expect(pinLeanAngle({ x: 395, y: 150 }, 1, B)).toBe(-16);
    expect(pinLeanAngle({ x: 5, y: 5 }, 1, B)).toBe(106);
  });

  test('an exact tie goes clockwise', () => {
    expect(pinLeanAngle({ x: 200, y: 5 }, 1, B)).toBe(106);
  });

  test('the divisor shrinks the pin before fitting', () => {
    expect(pinLeanAngle({ x: 100, y: 3 }, 2, B)).toBe(104);
  });

  test('nothing fits: point at the centre, finite', () => {
    expect(pinLeanAngle({ x: 2, y: 2 }, 1, { x: 0, y: 0, width: 20, height: 20 })).toBeCloseTo(135);
    expect(pinLeanAngle({ x: 500, y: 150 }, 1, B)).toBeCloseTo(-90); // tip outside the bounds
  });

  test('empty bounds (before layout) stay upright', () => {
    expect(pinLeanAngle({ x: 0, y: 0 }, 1, { x: 0, y: 0, width: 0, height: 0 })).toBe(0);
  });
});

describe('visibleImageBounds', () => {
  const view = { width: 400, height: 300, position: { x: 0, y: 0 }, scale: 1 };

  test('at zoom 1 the whole image, in both spaces', () => {
    expect(visibleImageBounds(view, 'screen')).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(visibleImageBounds(view, 'image')).toEqual({ x: 0, y: 0, width: 400, height: 300 });
  });

  test('zoomed 2× about the centre: the screen is full, the image shows its middle half', () => {
    const z = { ...view, scale: 2 };
    expect(visibleImageBounds(z, 'screen')).toEqual({ x: 0, y: 0, width: 400, height: 300 });
    expect(visibleImageBounds(z, 'image')).toEqual({ x: 100, y: 75, width: 200, height: 150 });
  });

  test('panned right by 50 at 2×', () => {
    const z = { ...view, scale: 2, position: { x: 50, y: 0 } };
    expect(visibleImageBounds(z, 'image')).toEqual({ x: 75, y: 75, width: 200, height: 150 });
  });

  test('zoomed out (scale < 1): the screen rect shrinks to the image', () => {
    const z = { ...view, scale: 0.5 };
    expect(visibleImageBounds(z, 'screen')).toEqual({ x: 100, y: 75, width: 200, height: 150 });
  });
});
