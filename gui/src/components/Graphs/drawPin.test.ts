import type * as d3 from 'd3';
import { drawPin, updatePinLean } from './drawPin';
import { fakeSelection, allTags } from './testing/fakeSelection';

type G = d3.Selection<SVGGElement, unknown, null, undefined>;
const B = { x: 0, y: 0, width: 400, height: 300 };

describe('drawPin lean', () => {
  test('an upright pin has an arm group with no transform', () => {
    const layer = fakeSelection();
    drawPin({ layer: layer as unknown as G, tip: { x: 100, y: 100 }, kind: 'point', label: '1', bounds: B });
    const arm = layer.select('.pin-arm').node();
    expect(arm.tag).toBe('g');
    expect(arm.attrs.transform).toBeNull();
  });

  test('near the top edge the arm rotates about the tip and the label is counter-rotated about the head centre', () => {
    const layer = fakeSelection();
    drawPin({ layer: layer as unknown as G, tip: { x: 100, y: 5 }, kind: 'left', label: 'L', bounds: B });
    const arm = layer.select('.pin-arm').node();
    expect(arm.attrs.transform).toBe('rotate(106, 100, 5)');
    const label = layer.select('.pin-label').node();
    expect(label.attrs.transform).toBe('rotate(-106, 100, -29)'); // head centre = 5 - 34
  });

  test('the ring and centre dot stay outside the arm, on the tip', () => {
    const layer = fakeSelection();
    drawPin({ layer: layer as unknown as G, tip: { x: 100, y: 5 }, kind: 'point', bounds: B });
    const arm = layer.select('.pin-arm').node();
    const armCircles = allTags(arm, 'circle');
    const all = allTags(layer.node(), 'circle');
    const outside = all.filter((c) => !armCircles.includes(c));
    outside.forEach((c) => {
      expect(c.attrs.cx).toBe(100);
      expect(c.attrs.cy).toBe(5);
    });
  });

  test('updatePinLean re-leans a dragged pin about the tip it was drawn at', () => {
    const layer = fakeSelection();
    const pin = drawPin({ layer: layer as unknown as G, tip: { x: 100, y: 100 }, kind: 'point', label: '2', bounds: B });
    updatePinLean(pin, { x: 100, y: 5 }, 1, B);
    expect(layer.select('.pin-arm').node().attrs.transform).toBe('rotate(106, 100, 100)');
    expect(layer.select('.pin-label').node().attrs.transform).toBe('rotate(-106, 100, 66)');
    updatePinLean(pin, { x: 100, y: 150 }, 1, B);
    expect(layer.select('.pin-arm').node().attrs.transform).toBeNull();
  });
});
