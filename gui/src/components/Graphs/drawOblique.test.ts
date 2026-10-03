import type * as d3 from 'd3';
import { drawOblique } from './drawOblique';
import { fakeSelection, FakeNode } from './testing/fakeSelection';

type G = d3.Selection<SVGGElement, unknown, null, undefined>;

// d3 ships as ESM, which this Jest config does not transform; drawOblique only
// needs d3.drag() to build a behaviour it attaches, which the fake ignores.
jest.mock('d3', () => {
  const drag = (): unknown => {
    const behaviour = { subject: () => behaviour, on: () => behaviour };
    return behaviour;
  };
  return { drag };
});

const distanceLines = (root: FakeNode) =>
  root.children
    .filter((c) => c.attrs.class === 'oblique-distance')
    .map((g) => g.children.find((l) => l.attrs.class === 'ov-stroke')!);

describe('drawOblique distance lines', () => {
  test('each of the 6 distances is drawn once, so every halo has the same weight', () => {
    const layer = fakeSelection();
    drawOblique({
      layer: layer as unknown as G,
      uiLayer: fakeSelection() as unknown as G,
      localPoints: [
        { x: 50, y: 50 },
        { x: 350, y: 50 },
        { x: 350, y: 250 },
        { x: 50, y: 250 },
      ],
      factor: 1,
      setMousePressed: () => undefined,
      setPointsInStore: () => undefined,
      scale: 1,
      position: { x: 0, y: 0 },
      isDefaultCoordinates: false,
      imageSrc: '',
      imageWidth: 400,
      imageHeight: 300,
    });
    const lines = distanceLines(layer.node());
    expect(lines).toHaveLength(6);
    const key = (l: FakeNode) => [l.attrs.x1, l.attrs.y1, l.attrs.x2, l.attrs.y2].join(',');
    const pairs = lines.map(key);
    expect(new Set(pairs).size).toBe(6);
    // the 2→4 diagonal (points 1 and 3, zero-based) is D24's fallback colour
    expect(lines.find((l) => key(l) === '350,50,50,250')?.attrs.stroke).toBe('#7765E3');
  });
});
