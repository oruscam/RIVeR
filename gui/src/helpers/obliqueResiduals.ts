export type PairKey = 'd12' | 'd23' | 'd34' | 'd41' | 'd13' | 'd24';

export interface DistanceResidual {
  pair: PairKey;
  label: string;
  entered: number;
  solved: number;
  /** solved - entered, in the same unit as the entered distances. */
  residual: number;
}

const PAIRS: [PairKey, number, number][] = [
  ['d12', 0, 1],
  ['d23', 1, 2],
  ['d34', 2, 3],
  ['d41', 3, 0],
  ['d13', 0, 2],
  ['d24', 1, 3],
];

export function obliqueResiduals(
  rw: { x: number; y: number }[],
  distances: Record<PairKey, number>
): DistanceResidual[] | null {
  if (rw.length < 4) return null;
  return PAIRS.map(([pair, a, b]) => {
    const solved = Math.hypot(rw[b].x - rw[a].x, rw[b].y - rw[a].y);
    const entered = distances[pair];
    return { pair, label: `${a + 1}-${b + 1}`, entered, solved, residual: solved - entered };
  });
}
