export interface FrameProgress {
  current: number;
  total: number;
}

/** Reads the `frame N/M` counter the frame extractor prints; null for any other line. */
export const parseFrameProgress = (text: string): FrameProgress | null => {
  const match = text.match(/frame\s+(\d+)\/(\d+)/);
  if (!match) return null;
  const total = parseInt(match[2]);
  if (total === 0) return null;
  return { current: parseInt(match[1]), total };
};
