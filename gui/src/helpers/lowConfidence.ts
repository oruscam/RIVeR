/**
 * A station counts as STIV low-confidence when its raw uncertainty exceeds
 * its raw velocity magnitude — mirrors Carousel.tsx's own inline check
 * exactly. A dry-bank station has v = 0 and sigma at its floor, which would
 * otherwise satisfy `sigma > |v|` while meaning nothing, hence the
 * `v !== 0` guard.
 */
export const isLowConfidence = (v: number | null | undefined, sigma: number | null | undefined): boolean =>
  v !== null && v !== undefined && v !== 0 && sigma !== null && sigma !== undefined && sigma > Math.abs(v);
