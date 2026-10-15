import { getSectionComponents, getSectionTangent } from './vectorComponents';

const IDENTITY = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

describe('getSectionTangent', () => {
  it('is the unit vector from the left point to the right one', () => {
    const tangent = getSectionTangent(
      [
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ],
      IDENTITY
    );
    expect(tangent?.x).toBeCloseTo(0.6);
    expect(tangent?.y).toBeCloseTo(0.8);
  });

  it('is null without a transformation or with a zero-length section', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
    ];
    expect(getSectionTangent(points, [])).toBeNull();
    expect(getSectionTangent([points[0], points[0]], IDENTITY)).toBeNull();
    expect(getSectionTangent(undefined, IDENTITY)).toBeNull();
  });
});

describe('getSectionComponents', () => {
  // A section running east: the backend's rotation gives crosswise = east and
  // streamwise = north.
  it('reads north as streamwise and east as crosswise on a section running east', () => {
    const { streamwise, crosswise } = getSectionComponents(0.3, 1.2, { x: 1, y: 0 });
    expect(streamwise).toBeCloseTo(1.2);
    expect(crosswise).toBeCloseTo(0.3);
  });

  it('gives a negative streamwise for flow on the other side of the section', () => {
    expect(getSectionComponents(0, -1, { x: 1, y: 0 }).streamwise).toBeCloseTo(-1);
  });

  it('keeps the magnitude of the velocity', () => {
    const { streamwise, crosswise } = getSectionComponents(0.7, -0.4, { x: 0.6, y: 0.8 });
    expect(Math.hypot(streamwise, crosswise)).toBeCloseTo(Math.hypot(0.7, -0.4));
  });
});
