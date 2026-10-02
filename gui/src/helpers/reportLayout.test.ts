import { buildSheets, frameBox, frameFactor, snapshotFrames, splitColumns } from './reportLayout';
import type { ReportModel } from './reportModel';

const model = (stations: number[]): ReportModel =>
  ({
    sections: stations.map((n, i) => ({ index: i, numStations: n })),
    skipped: [], totalQ: 0, qStdBetween: null, cov: null, techniquesUsed: ['lspiv'],
  }) as unknown as ReportModel;

describe('buildSheets', () => {
  test('cover, one sheet per short section, calibration, footage', () => {
    expect(buildSheets(model([10, 20]), true).map((s) => s.kind)).toEqual(['cover', 'section', 'section', 'calibration', 'footage']);
  });

  test('no calibration sheet when there is no calibration evidence', () => {
    expect(buildSheets(model([10]), false).map((s) => s.kind)).toEqual(['cover', 'section', 'footage']);
  });

  test('a 130-station table continues onto two more sheets with exact row ranges', () => {
    const sections = buildSheets(model([130]), true).filter((s) => s.kind === 'section');
    expect(sections).toEqual([
      { kind: 'section', sectionIndex: 0, rowStart: 0, rowEnd: 24, continued: false },
      { kind: 'section', sectionIndex: 0, rowStart: 24, rowEnd: 120, continued: true },
      { kind: 'section', sectionIndex: 0, rowStart: 120, rowEnd: 130, continued: true },
    ]);
  });

  test('exactly FIRST_SHEET_ROWS stations makes no empty continuation sheet', () => {
    expect(buildSheets(model([24]), true).filter((s) => s.kind === 'section')).toHaveLength(1);
  });

  test('sectionIndex points into model.sections, not the store', () => {
    const m = model([5, 5]);
    m.sections[1].index = 7;
    const s = buildSheets(m, false).filter((x) => x.kind === 'section');
    expect(s.map((x) => (x as { sectionIndex: number }).sectionIndex)).toEqual([0, 1]);
  });
});

describe('frameBox / frameFactor', () => {
  test('landscape video fills the width', () => {
    expect(frameBox(1920, 1080, 680, 300)).toEqual({ width: 533.33, height: 300 });
    expect(frameBox(1920, 1080, 680, 420)).toEqual({ width: 680, height: 382.5 });
  });
  test('portrait video is limited by height', () => {
    expect(frameBox(1080, 1920, 680, 300)).toEqual({ width: 168.75, height: 300 });
  });
  test('factor maps resized-frame pixels to the box', () => {
    expect(frameFactor(1920, 1080, 0.5, { width: 480, height: 270 })).toEqual({ x: 2, y: 2 });
  });
});

describe('splitColumns', () => {
  test('two balanced columns, first one longer', () => {
    expect(splitColumns(0, 5)).toEqual([[0, 3], [3, 5]]);
    expect(splitColumns(24, 120)).toEqual([[24, 72], [72, 120]]);
  });
  test('one row stays one column', () => {
    expect(splitColumns(0, 1)).toEqual([[0, 1]]);
  });
});

describe('snapshotFrames', () => {
  test('five frames, first and last included, times offset by the range start', () => {
    // The old report labelled the middle frames from 0 instead of startTime; this pins the fix.
    expect(snapshotFrames(101, 10, 30)).toEqual([
      { index: 0, time: 10 },
      { index: 25, time: 15 },
      { index: 50, time: 20 },
      { index: 75, time: 25 },
      { index: 100, time: 30 },
    ]);
  });
  test('fewer than five frames: each frame once', () => {
    expect(snapshotFrames(3, 0, 2).map((f) => f.index)).toEqual([0, 1, 2]);
  });
  test('no frames: empty strip', () => {
    expect(snapshotFrames(0, 0, 10)).toEqual([]);
  });
});
