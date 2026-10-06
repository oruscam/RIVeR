import { StabilizationRegion } from '../store/project/types';

/** On-screen size of the region toolbar (.shape-toolbar with two .ibtn-sm). */
export const REGION_TOOLBAR_SIZE = { width: 64, height: 32 };
/** On-screen gap between the region's edge and its toolbar. */
const GAP_PX = 10;
/** On-screen margin kept between the toolbar and the edge of the visible view. */
const MARGIN_PX = 8;

interface PlacementInput {
  region: StabilizationRegion;
  /** The video's own pixel size (the SVG viewBox). */
  videoWidth: number;
  videoHeight: number;
  /** The video box's unzoomed CSS size. */
  boxWidth: number;
  boxHeight: number;
  /** The zoom applied by an ancestor as `translate(position) scale(scale)` about the box centre. */
  scale: number;
  position: { x: number; y: number };
  toolbar?: { width: number; height: number };
}

const clamp = (value: number, min: number, max: number) => (max < min ? min : Math.min(Math.max(value, min), max));

/**
 * Where the region toolbar's top-left corner goes, in the video box's
 * unzoomed CSS pixels. Like the mask toolbar, it sits next to the shape: under
 * the region's bottom edge, centred; above the top edge when there is no room
 * under it; inside the region's lower edge when there is room on neither side.
 * It is always kept inside the part of the box visible through the zoom. The
 * caller counter-scales it by 1/scale, so its on-screen size never changes.
 */
export const regionToolbarPlacement = ({
  region,
  videoWidth,
  videoHeight,
  boxWidth,
  boxHeight,
  scale,
  position,
  toolbar = REGION_TOOLBAR_SIZE,
}: PlacementInput): { left: number; top: number } => {
  const kx = boxWidth / videoWidth;
  const ky = boxHeight / videoHeight;
  const left0 = region.x * kx;
  const right0 = (region.x + region.width) * kx;
  const top0 = region.y * ky;
  const bottom0 = (region.y + region.height) * ky;

  // Screen = c + p + s(local - c), so the viewport [0, W] maps back to
  // local [c - (c + p)/s, c + (c - p)/s].
  const cx = boxWidth / 2;
  const cy = boxHeight / 2;
  const viewLeft = Math.max(0, cx - (cx + position.x) / scale);
  const viewRight = Math.min(boxWidth, cx + (cx - position.x) / scale);
  const viewTop = Math.max(0, cy - (cy + position.y) / scale);
  const viewBottom = Math.min(boxHeight, cy + (cy - position.y) / scale);

  const w = toolbar.width / scale;
  const h = toolbar.height / scale;
  const gap = GAP_PX / scale;
  const margin = MARGIN_PX / scale;

  const left = clamp((left0 + right0) / 2 - w / 2, viewLeft + margin, viewRight - margin - w);

  const below = bottom0 + gap;
  if (below + h <= viewBottom - margin) return { left, top: below };

  const above = top0 - gap - h;
  if (above >= viewTop + margin) return { left, top: above };

  const inside = Math.min(bottom0, viewBottom) - gap - h;
  return { left, top: clamp(inside, viewTop + margin, viewBottom - margin - h) };
};
