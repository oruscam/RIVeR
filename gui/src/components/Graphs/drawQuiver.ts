import * as d3 from 'd3';
import type { QuiverData } from '../../../commons/types';
import { UNIT_CONVERSIONS, UNITS, VECTORS } from '../../constants/constants';
import { formatSignedVelocity } from '../../helpers/chevronGlyph';
import { getSectionComponents } from '../../helpers/vectorComponents';
import { getThemedHost } from '../../helpers/themedHost';

export interface VectorTipOptions {
  isImperial: boolean;
  labels: { east: string; north: string; streamwise: string; crosswise: string; velocity: string };
  /** Unit vector along the active section, left to right, in real-world
   *  coordinates; null where there is no section to split the velocity on. */
  sectionTangent: { x: number; y: number } | null;
}

/** Gap between the cursor and the tip, and the tip's distance from the window's edge. */
const TIP_OFFSET = 14;

/**
 * Draws the velocity vectors of one frame pair. Hovering a vector's tip shows
 * what that vector is, beside the cursor (.point-tip): where it is in the real
 * world, and its velocity split on the active cross section. Streamwise is the
 * component the discharge is computed from, so it carries the emphasis and the
 * vector's colour on the bar; crosswise is there to judge it against. It
 * follows the cursor rather than docking in a corner because a field has
 * hundreds of vectors and the values have to be read next to the one they
 * belong to.
 */
export const drawQuiver = (
  svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  data: QuiverData[],
  factor: number,
  { isImperial, labels, sectionTangent }: VectorTipOptions
) => {
  const defs = svg.append('defs');
  data.forEach((d, i) => {
    defs
      .append('marker')
      .attr('id', `arrow-${i}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 1)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d.color)
      .attr('z-index', 15);
  });

  // Tooltip div
  let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> = d3.select<HTMLDivElement, unknown>(
    '#quiver-tooltip'
  );
  if (tooltip.empty()) {
    tooltip = d3
      .select<HTMLDivElement, unknown>(getThemedHost() as HTMLDivElement)
      .append('div')
      .attr('id', 'quiver-tooltip')
      .attr('class', 'point-tip')
      .style('top', () => '0px')
      .style('opacity', () => '0');
  } else {
    // Reuse existing tooltip (reset opacity/position if needed)
    tooltip.style('opacity', () => '0').style('top', () => '0px');
  }

  const lengthFactor = isImperial ? UNIT_CONVERSIONS.M_TO_FT : 1;
  const lengthUnit = isImperial ? UNITS.IMPERIAL.LONGITUDE : UNITS.SI.LONGITUDE;

  const addRow = (label: string, value: string, modifier?: string, swatch?: string) => {
    const key = tooltip.append('span').attr('class', modifier ?? null);
    if (swatch)
      key
        .append('span')
        .attr('class', 'readout-swatch')
        .style('background', () => swatch);
    key.append('span').text(label);
    tooltip
      .append('b')
      .attr('class', modifier ?? null)
      .text(value);
  };

  const fillTip = (d: QuiverData) => {
    tooltip.selectAll('*').remove();
    if (d.east !== undefined && d.north !== undefined) {
      addRow(labels.east, `${(d.east * lengthFactor).toFixed(2)} ${lengthUnit}`);
      addRow(labels.north, `${(d.north * lengthFactor).toFixed(2)} ${lengthUnit}`);
      tooltip.append('div').attr('class', 'point-tip-rule');
    }
    if (sectionTangent && d.velocityEast !== undefined && d.velocityNorth !== undefined) {
      const { streamwise, crosswise } = getSectionComponents(d.velocityEast, d.velocityNorth, sectionTangent);
      // Same formatter as the Results chevron readout, so the two agree on the
      // explicit +/- sign, the true minus glyph and the unit conversion.
      addRow(labels.streamwise, formatSignedVelocity(streamwise, isImperial), 'point-tip-key', d.color);
      addRow(labels.crosswise, formatSignedVelocity(crosswise, isImperial), 'point-tip-minor');
    } else {
      addRow(labels.velocity, formatSignedVelocity(d.velocity, isImperial), 'point-tip-key', d.color);
    }
  };

  // Right of and below the cursor, flipped to the other side where the tip
  // would leave the window.
  const placeTip = (event: MouseEvent) => {
    const box = tooltip.node()!.getBoundingClientRect();
    const fitsRight = event.clientX + TIP_OFFSET + box.width <= window.innerWidth;
    const fitsBelow = event.clientY + TIP_OFFSET + box.height <= window.innerHeight;
    const left = fitsRight ? event.pageX + TIP_OFFSET : event.pageX - TIP_OFFSET - box.width;
    const top = fitsBelow ? event.pageY + TIP_OFFSET : event.pageY - TIP_OFFSET - box.height;
    tooltip.style('left', () => `${left}px`).style('top', () => `${top}px`);
  };

  // 🔹 Líneas de los vectores
  svg
    .selectAll('line')
    .data(data)
    .enter()
    .append('line')
    .attr('x1', (d) => d.x / factor)
    .attr('y1', (d) => d.y / factor)
    .attr('x2', (d) => d.x / factor + (d.u * VECTORS.VELOCITY_AMPLITUDE_FACTOR) / factor)
    .attr('y2', (d) => d.y / factor + (d.v * VECTORS.VELOCITY_AMPLITUDE_FACTOR) / factor)
    .attr('stroke', (d) => d.color)
    .attr('stroke-width', 2.3)
    .attr('marker-end', (_d, i) => `url(#arrow-${i})`);

  // 🔹 Área de interacción más grande (círculo invisible en la punta)
  const hitboxRadius = 12; // 👈 ajusta el tamaño del área

  svg
    .selectAll('circle.hitbox')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'hitbox')
    .attr('cx', (d) => d.x / factor + (d.u * VECTORS.VELOCITY_AMPLITUDE_FACTOR) / factor)
    .attr('cy', (d) => d.y / factor + (d.v * VECTORS.VELOCITY_AMPLITUDE_FACTOR) / factor)
    .attr('r', hitboxRadius)
    .style('fill', () => 'transparent')
    .style('cursor', () => 'pointer')
    .on('mouseover', function (event: MouseEvent, d: QuiverData) {
      tooltip.transition().duration(200).style('opacity', 1);
      fillTip(d);
      placeTip(event);
    })
    .on('mousemove', function (event: MouseEvent) {
      placeTip(event);
    })
    .on('mouseout', function () {
      tooltip.transition().duration(300).style('opacity', 0);
    });
};
