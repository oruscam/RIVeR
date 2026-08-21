import * as d3 from 'd3';
// commons/ sits at the gui/ root, not under src/, so from src/components/Graphs/
// this is three levels up — unlike src/helpers/ or src/components/, which are one
// level shallower and correctly use '../../commons/...'.
import { createColorMap, Normalize } from '../../../commons/vectors';
import {
  chevronCount,
  flowDirection,
  formatSignedVelocity,
  THICKNESS_FACTOR,
  WING_SPAN,
} from '../../helpers/chevronGlyph';
import { SectionData } from '../../store/section/types';
import { getThemedHost } from '../../helpers/themedHost';

type Pt = { x: number; y: number };

/**
 * Inverts a 3x3 matrix. Mirrors the (unexported) `invertMatrix` in
 * `commons/coordinates.ts`, duplicated here on purpose: `place()` below calls
 * the projection ~40 times per station per frame, and `transformRealWorldToPixel`
 * re-inverts the transformation matrix on every single call. Inverting once per
 * `drawVectors` call and reusing it avoids ~600 matrix inversions (and their
 * array allocations) per frame per section.
 */
const invert3x3 = (matrix: number[][]): number[][] => {
  const det =
    matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) -
    matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0]) +
    matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

  if (det === 0) {
    throw new Error('Matrix is not invertible');
  }

  const invDet = 1 / det;

  return [
    [
      (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) * invDet,
      (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) * invDet,
      (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * invDet,
    ],
    [
      (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) * invDet,
      (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * invDet,
      (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) * invDet,
    ],
    [
      (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) * invDet,
      (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) * invDet,
      (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) * invDet,
    ],
  ];
};

/**
 * Same maths as `transformRealWorldToPixel` (same projective divide by the
 * third homogeneous component), but against an already-inverted matrix so the
 * inversion isn't repeated per vertex.
 */
const projectWithInverse = (x_rw: number, y_rw: number, inv: number[][]): [number, number] => {
  const rw = [x_rw, y_rw, 1];
  const pixel = inv.map((row) => row.reduce((sum, value, index) => sum + value * rw[index], 0));
  const w = pixel[2] || 1;
  return [pixel[0] / w, pixel[1] / w];
};

/**
 * Draws one animated chevron glyph per station over the snapshot.
 *
 * Every vertex is defined in REAL-WORLD METRES at the station and projected
 * through the homography. This is not a stylistic choice: a homography does not
 * preserve perpendicularity, so building the glyph in pixel space (taking the
 * section's perpendicular on screen, sizing from pixel spacing) was measured
 * wrong by 25-48 degrees of direction and ~5x of scale on real oblique frames.
 * Projecting metres makes perspective exact and needs no correction factor.
 *
 * `phase` is the animation clock in turns (0..1 per cycle); `animated` tells
 * the glyph whether `phase` is actually moving. When it isn't (report render,
 * `prefers-reduced-motion`), chevrons are laid out evenly along the arrow
 * (never at the degenerate `f = 0` position) at a fixed, fully legible opacity
 * instead of the animated sine fade, so the static glyph carries the same
 * information the moving one does — motion is an enhancement, not the only
 * carrier of meaning.
 *
 * `hoveredStation` / `onHoverStation` move the hover highlight out of direct
 * DOM mutation: the caller owns the hovered index as React state, passes it
 * back in so the next draw renders that station's chevrons at full opacity,
 * and `onHoverStation` is how the hit area reports hover start/end instead of
 * mutating polygons that a later animation frame will have already replaced.
 */
export const drawVectors = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  factor: number | { x: number; y: number },
  sectionIndex: number,
  interpolated: boolean,
  data: SectionData,
  /** Per-station velocities already resolved for the active technique,
   *  interpolation, seeding and station checks — what the chart plots. */
  magnitude: (number | null)[],
  isReport: boolean,
  transformationMatrix: number[][],
  imageWidth: number,
  imageHeight: number,
  globalMin: number,
  globalMax: number,
  phase: number,
  animated: boolean,
  hoveredStation: number | null,
  onHoverStation: (station: number | null) => void,
  unitSistem?: string
) => {
  const { east, north, distance, check, streamwise_east, streamwise_north } = data;
  if (!east || !north || !magnitude || !distance) return;
  // transformationMatrix defaults to [] until the section's homography is
  // resolved; invert3x3 below indexes into it unconditionally, so bail before
  // that rather than throwing out of a useEffect.
  if (!transformationMatrix?.length) return;

  const fx = typeof factor === 'number' ? factor : factor.x;
  const fy = typeof factor === 'number' ? factor : factor.y;

  const n = east.length;
  const spacingM = n > 1 ? Math.abs(distance[n - 1] - distance[0]) / (n - 1) : 1;
  const maxLenM = spacingM * 2;
  const widthM = spacingM * 0.5;
  const thicknessM = widthM * 0.16 * THICKNESS_FACTOR;

  const colorMap = createColorMap();
  const norm = new Normalize(globalMin, globalMax);
  const range = Math.max(Math.abs(globalMin), Math.abs(globalMax)) || 1;
  const invMatrix = invert3x3(transformationMatrix);

  // Tooltip: one lazily created node reused across renders. Styling comes from
  // the shared .velocity-readout class — the same one the PIV arrow tooltip and
  // the STI badge use — so the three cannot drift apart, and so the background
  // follows the theme (it is cream in light and #282a36 in dracula, not the dark
  // grey a hardcoded colour would pin it to).
  let tooltip = d3.select<HTMLDivElement, unknown>('#vectors-tooltip');
  if (tooltip.empty()) {
    tooltip = d3
      .select<HTMLDivElement, unknown>(getThemedHost() as HTMLDivElement)
      .append('div')
      .attr('id', 'vectors-tooltip')
      .attr('class', 'velocity-readout')
      .style('position', 'absolute')
      .style('top', '0px')
      .style('pointer-events', 'none')
      .style('opacity', '0');
  }

  magnitude.forEach((v, i) => {
    if (v === null || isNaN(v)) return;
    if (check[i] === false && interpolated === false) return;

    const speed = Math.abs(v);
    const lengthM = (speed / range) * maxLenM;
    if (lengthM <= 0) return; // zero velocity draws nothing at all

    const dir = flowDirection(i, v, east, north, streamwise_east, streamwise_north);
    // Cross axis: the section tangent, so wings sit across the flow.
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    const tx = east[b] - east[a];
    const ty = north[b] - north[a];
    const tl = Math.hypot(tx, ty) || 1;
    const tan = { x: tx / tl, y: ty / tl };

    /** (along, across) in metres → display pixels. */
    const place = (along: number, across: number): Pt => {
      const e = east[i] + dir.x * along + tan.x * across;
      const nn = north[i] + dir.y * along + tan.y * across;
      const [px, py] = projectWithInverse(e, nn, invMatrix);
      return { x: px / fx, y: py / fy };
    };

    const base = place(0, 0);
    const tip = place(lengthM, 0);
    if (Math.hypot(tip.x - base.x, tip.y - base.y) < 2) return;

    const clamped = Math.max(globalMin, Math.min(globalMax, v));
    const idx = Math.max(
      0,
      Math.min(Math.floor(norm.normalize(clamped) * (colorMap.length - 1)), colorMap.length - 1)
    );
    const color = colorMap[idx];

    const count = chevronCount(lengthM, widthM);
    const hw = widthM * WING_SPAN;
    const back = widthM * 0.5;

    const group = svg.append('g').classed(`section-${sectionIndex}`, true);
    if (!isReport) group.attr('filter', 'url(#chevron-soft-shadow)');

    // Fixed per-station phase offset so a shared period doesn't march in lockstep.
    const offset = (i * 0.618) % 1;
    const isHovered = hoveredStation === i;

    for (let k = 0; k < count; k++) {
      // Static passes never let a chevron sit at the degenerate f = 0/1
      // position (all six vertices collapsing onto the base) and never fade
      // it to near-zero opacity — the glyph must be fully legible without
      // motion.
      const f = animated ? (phase + offset + k / count) % 1 : (k + 0.5) / count;
      const apex = Math.max(0, lengthM * f);
      const wing = Math.max(0, apex - back);
      const innerApex = Math.max(0, apex - thicknessM);
      const innerWing = Math.max(0, wing - thicknessM);
      const pts = [
        place(wing, hw),
        place(apex, 0),
        place(wing, -hw),
        place(innerWing, -hw),
        place(innerApex, 0),
        place(innerWing, hw),
      ];

      const fillOpacity = isHovered ? 1 : animated ? Math.sin(Math.PI * f) * 0.95 : 0.85;
      const strokeOpacity = isHovered ? 1 : animated ? Math.sin(Math.PI * f) * 0.5 : 0.5;

      group
        .append('polygon')
        .attr('points', pts.map((p) => `${p.x},${p.y}`).join(' '))
        .attr('fill', color)
        .attr('fill-opacity', fillOpacity)
        .attr('stroke', color)
        .attr('stroke-opacity', strokeOpacity)
        .attr('stroke-width', 0.8)
        .attr('stroke-linejoin', 'round')
        .attr('pointer-events', 'none');
    }

    if (isReport === false && typeof factor === 'number') {
      // Hit area is the whole swept glyph, not the chevrons: chevrons move, so
      // hit-testing them would make the tooltip flicker as they slide out from
      // under the pointer.
      const hit = [place(0, hw), place(lengthM, hw), place(lengthM, -hw), place(0, -hw)];
      svg
        .append('polygon')
        .attr('points', hit.map((p) => `${p.x},${p.y}`).join(' '))
        .attr('fill', 'transparent')
        .attr('pointer-events', 'all')
        .classed(`section-${sectionIndex}`, true)
        .on('mouseover', function (event) {
          onHoverStation(i);
          tooltip.transition().duration(200).style('opacity', 1);
          tooltip
            .html(formatSignedVelocity(v, unitSistem === 'imperial'))
            .style('left', `${event.pageX}px`)
            .style('top', `${event.pageY}px`)
            .style('color', color)
            .style('z-index', 1000);
        })
        .on('mouseout', function () {
          onHoverStation(null);
          tooltip.transition().duration(300).style('opacity', 0);
        });
    }
  });
};
