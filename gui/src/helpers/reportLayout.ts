import { REPORT_SHEET } from '../constants/constants';
import type { ReportModel } from './reportModel';

export type ReportSheet =
  | { kind: 'cover' }
  | { kind: 'section'; sectionIndex: number; rowStart: number; rowEnd: number; continued: boolean }
  | { kind: 'calibration' }
  | { kind: 'footage' };

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Every sheet is one printed page, so the page count is sheets.length. */
export function buildSheets(model: ReportModel, hasCalibration: boolean): ReportSheet[] {
  const sheets: ReportSheet[] = [{ kind: 'cover' }];
  model.sections.forEach((section, sectionIndex) => {
    const n = section.numStations;
    const firstEnd = Math.min(n, REPORT_SHEET.FIRST_SHEET_ROWS);
    sheets.push({ kind: 'section', sectionIndex, rowStart: 0, rowEnd: firstEnd, continued: false });
    for (let start = firstEnd; start < n; start += REPORT_SHEET.CONTINUATION_ROWS) {
      const end = Math.min(n, start + REPORT_SHEET.CONTINUATION_ROWS);
      sheets.push({ kind: 'section', sectionIndex, rowStart: start, rowEnd: end, continued: true });
    }
  });
  if (hasCalibration) sheets.push({ kind: 'calibration' });
  sheets.push({ kind: 'footage' });
  return sheets;
}

export function frameBox(videoWidth: number, videoHeight: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
  return { width: round2(videoWidth * scale), height: round2(videoHeight * scale) };
}

/** Same meaning as the old Report.tsx factor: resized-frame pixels per box pixel. */
export function frameFactor(
  videoWidth: number,
  videoHeight: number,
  resizeFactor: number,
  box: { width: number; height: number }
) {
  return { x: (videoWidth * resizeFactor) / box.width, y: (videoHeight * resizeFactor) / box.height };
}

export function splitColumns(start: number, end: number): [number, number][] {
  const count = end - start;
  if (count <= 1) return [[start, end]];
  const mid = start + Math.ceil(count / 2);
  return [
    [start, mid],
    [mid, end],
  ];
}

/** Up to 5 evenly spread frames of the processed range: index into images.paths, and time in seconds from the video start. */
export function snapshotFrames(frameCount: number, startTime: number, endTime: number) {
  if (frameCount <= 0) return [];
  const count = Math.min(5, frameCount);
  if (count === 1) return [{ index: 0, time: startTime }];
  return Array.from({ length: count }, (_, k) => {
    const index = Math.round((k * (frameCount - 1)) / (count - 1));
    // Time follows the frame actually shown, so rounding never mislabels it.
    const time = startTime + (index / (frameCount - 1)) * (endTime - startTime);
    return { index, time: round2(time) };
  });
}
