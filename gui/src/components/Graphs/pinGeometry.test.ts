import { getPinGeometry, PIN_BASE } from './pinGeometry';

describe('getPinGeometry', () => {
  it('exposes the base (divisor=1) constants the geometry is built from', () => {
    expect(PIN_BASE).toEqual({
      HEAD_RADIUS: 12,
      HEAD_OFFSET_Y: 34,
      RING_RADIUS: 6.5,
      TICK_LENGTH: 3,
      TICK_GAP: 1.5,
      NEEDLE_WIDTH: 1.5,
      NEEDLE_HALO_WIDTH: 4,
      RING_WIDTH: 1.6,
      RING_HALO_WIDTH: 4,
      TICK_WIDTH: 1.4,
      CENTER_DOT_RADIUS: 1.5,
      HEAD_HALO_WIDTH: 3,
      HEAD_BORDER_WIDTH: 1.5,
      LABEL_FONT_SIZE: 13,
      LABEL_Y_NUDGE: 4.5,
    });
  });

  it('places the head 34px above the tip and the ring exactly at the tip, at divisor 1', () => {
    const g = getPinGeometry({ x: 100, y: 200 });
    expect(g.head).toEqual({ cx: 100, cy: 166, r: 12 });
    expect(g.ring).toEqual({ cx: 100, cy: 200, r: 6.5 });
    expect(g.centerDot).toEqual({ x: 100, y: 200 });
  });

  it("runs the needle from the head's bottom edge to the ring's top edge", () => {
    const g = getPinGeometry({ x: 100, y: 200 });
    // head bottom edge = 166 + 12 = 178; ring top edge = 200 - 6.5 = 193.5
    expect(g.needle).toEqual({ x: 100, y1: 178, y2: 193.5 });
  });

  it('places the left/right/bottom ticks 1.5px outside the ring, 3px long', () => {
    const g = getPinGeometry({ x: 100, y: 200 });
    // ring edge = 100 ± 6.5; tick starts 1.5px past that, runs 3px further out
    expect(g.ticks.left).toEqual({ x1: 92, y1: 200, x2: 89, y2: 200 });
    expect(g.ticks.right).toEqual({ x1: 108, y1: 200, x2: 111, y2: 200 });
    expect(g.ticks.bottom).toEqual({ x1: 100, y1: 208, x2: 100, y2: 211 });
  });

  it('places the label at the head centre, nudged down 4.5px', () => {
    const g = getPinGeometry({ x: 100, y: 200 });
    expect(g.label).toEqual({ x: 100, y: 170.5 });
  });

  it('divides every dimension by the divisor, keeping the tip fixed', () => {
    const g = getPinGeometry({ x: 100, y: 200 }, 2);
    expect(g.head).toEqual({ cx: 100, cy: 183, r: 6 }); // (200 - 34/2), 12/2
    expect(g.ring).toEqual({ cx: 100, cy: 200, r: 3.25 });
    expect(g.needle).toEqual({ x: 100, y1: 189, y2: 196.75 });
    expect(g.ticks.left).toEqual({ x1: 96, y1: 200, x2: 94.5, y2: 200 });
    expect(g.label).toEqual({ x: 100, y: 183 + 2.25 });
  });
});
