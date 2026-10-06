import { getSearchLineVisual } from './searchLineState';

const colors = {
  preview: '#FFFFFF',
  accent: '#0678BE',
  muted: '#808080',
  warning: '#F5BF61',
  badge: 'rgba(50, 50, 50, 0.85)',
};

describe('getSearchLineVisual', () => {
  it('is white and not dashed before any STIV run', () => {
    const v = getSearchLineVisual({
      hasRun: false,
      velocityColor: null,
      isHovered: false,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v).toEqual({
      strokeColor: colors.preview,
      haloColor: 'rgba(0, 0, 0, 0.45)',
      strokeWidth: 1.5,
      haloWidth: 3.5,
      dashed: false,
      dotted: false,
      labelSuffix: '',
      badgeBackground: colors.badge,
    });
  });

  it('is grey and dashed for a station with no value after a run', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: null,
      isHovered: false,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v.strokeColor).toBe(colors.muted);
    expect(v.dashed).toBe(true);
  });

  it('uses the velocity colour, solid, once a station has a value', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: false,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v.strokeColor).toBe('#62C655');
    expect(v.dashed).toBe(false);
    expect(v.labelSuffix).toBe('');
    expect(v.badgeBackground).toBe(colors.badge);
  });

  it('appends a ✎ suffix and keeps the normal badge when tuned', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: false,
      tuned: true,
      lowConfidence: false,
      colors,
    });
    expect(v.labelSuffix).toBe(' ✎');
    expect(v.badgeBackground).toBe(colors.badge);
  });

  it('dashes the line, appends a ! suffix, and turns the badge warning-coloured when low-confidence', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: false,
      tuned: false,
      lowConfidence: true,
      colors,
    });
    expect(v.dashed).toBe(true);
    expect(v.labelSuffix).toBe(' !');
    expect(v.badgeBackground).toBe(colors.warning);
  });

  it('tuned wins the label suffix over lowConfidence when (in principle) both are true', () => {
    // isStationTuned/lowConfidence are mutually exclusive in practice — a manual
    // angle override replaces the fit sigma is derived from (mergedSigmaProfile
    // nulls sigma for tuned stations) — but the helper still needs a defined,
    // tested order so a future caller can't get an ambiguous suffix.
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: false,
      tuned: true,
      lowConfidence: true,
      colors,
    });
    expect(v.labelSuffix).toBe(' ✎');
  });

  it('thickens the line and swaps the halo to accent when hovered, keeping the state colour', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#62C655',
      isHovered: true,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v.strokeColor).toBe('#62C655');
    expect(v.haloColor).toBe(colors.accent);
    expect(v.strokeWidth).toBeGreaterThan(1.5);
    expect(v.haloWidth).toBeGreaterThan(3.5);
  });

  it('hover applies the same way in preview (before any run)', () => {
    const v = getSearchLineVisual({
      hasRun: false,
      velocityColor: null,
      isHovered: true,
      tuned: false,
      lowConfidence: false,
      colors,
    });
    expect(v.strokeColor).toBe(colors.preview);
    expect(v.haloColor).toBe(colors.accent);
  });

  it('is a muted dotted line with ⊘ when the whole line is masked, whatever STIV found', () => {
    const v = getSearchLineVisual({
      hasRun: true,
      velocityColor: '#ff0000',
      isHovered: false,
      tuned: false,
      lowConfidence: true,
      masked: true,
      colors,
    });
    expect(v.strokeColor).toBe(colors.muted);
    expect(v.dotted).toBe(true);
    expect(v.dashed).toBe(false);
    expect(v.strokeWidth).toBe(1);
    expect(v.labelSuffix).toBe(' ⊘');
    expect(v.badgeBackground).toBe(colors.badge);
  });

  it('keeps the hover halo on a masked line', () => {
    const v = getSearchLineVisual({
      hasRun: false, velocityColor: null, isHovered: true, tuned: false, lowConfidence: false, masked: true, colors,
    });
    expect(v.haloColor).toBe(colors.accent);
    expect(v.strokeWidth).toBe(2.5);
  });
});
