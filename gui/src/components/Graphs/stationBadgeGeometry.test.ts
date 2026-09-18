import { getStationBadgeGeometry, STATION_BADGE_BASE } from './stationBadgeGeometry';

describe('getStationBadgeGeometry', () => {
  it('centres the circle on the given point with the fixed radius', () => {
    const geo = getStationBadgeGeometry({ x: 100, y: 50 });
    expect(geo.circle).toEqual({ cx: 100, cy: 50, r: STATION_BADGE_BASE.RADIUS });
  });

  it('centres the label on the point, nudged for alphabetic baseline', () => {
    const geo = getStationBadgeGeometry({ x: 100, y: 50 });
    expect(geo.label).toEqual({ x: 100, y: 50 + STATION_BADGE_BASE.LABEL_Y_NUDGE });
  });

  it('tracks a different centre point', () => {
    const geo = getStationBadgeGeometry({ x: -20, y: 300 });
    expect(geo.circle.cx).toBe(-20);
    expect(geo.circle.cy).toBe(300);
  });
});
