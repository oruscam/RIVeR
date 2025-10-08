import * as d3 from 'd3';
import { calculateArrowWidth, calculateMultipleArrowsAdaptative } from '../../helpers';
import { SectionData } from '../../store/section/types';

export const drawVectors = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  factor: number | { x: number; y: number },
  sectionIndex: number,
  interpolated: boolean,
  data: SectionData,
  isReport: boolean,
  transformationMatrix: number[][],
  imageWidth: number,
  imageHeight: number,
  globalMin: number,
  globalMax: number
) => {
  // Data for drawing the vectors
  const { east, north, streamwise_velocity_magnitude, distance, check, activeMagnitude, Q } = data;

  if (!east || !north || !streamwise_velocity_magnitude || !distance) return;

  const magnitude = activeMagnitude;

  const arrowWidth = calculateArrowWidth(distance);

  const arrows = calculateMultipleArrowsAdaptative(
    east,
    north,
    magnitude,
    transformationMatrix,
    imageWidth,
    imageHeight,
    arrowWidth,
    globalMin,
    globalMax
  );

  // Tooltip div
  const tooltip = d3.select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "1px solid #ccc")
      .style("padding", "5px 10px")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("opacity", 0);

  if (arrows === undefined) return;
  arrows.forEach((arrow, i) => {
    if (check[i] === false && interpolated === false) return null;

    // Crear el polígono para la flecha
    if ('points' in arrow && 'color' in arrow) {
      const polygonPoints = arrow.points
        .map(
          (point: number[]) =>
            `${point[0] / (typeof factor === 'number' ? factor : factor.x)},${point[1] / (typeof factor === 'number' ? factor : factor.y)}`
        )
        .join(' ');

      const polygon = svg
        .append('polygon')
        .attr('points', polygonPoints)
        .attr('fill', arrow.color)
        .attr('fill-opacity', 0.7)
        .attr('stroke', arrow.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-width', 1.5)
        .attr('pointer-events', 'all')
        .classed(`section-${sectionIndex}`, true);

      if (isReport == false && typeof factor === 'number') {
        let textOffset = 10;
        if (arrow.points[2][1] > arrow.points[0][1]) {
          textOffset = -20;
        }

        polygon.on('mouseover', function (event) {
          polygon.attr('fill-opacity', 1); 
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip.html(`${arrow.magnitude!.toFixed(2)}`)
              .style("left", (event.pageX) + "px") 
              .style("top", (event.pageY) + "px")  
              .style('background', 'rgba(255, 255, 255, 0.4)')
              .style("z-index", 1000);
        });

        polygon.on('mouseout', function () {
          polygon.attr('fill-opacity', 0.7); 
          tooltip.transition().duration(300).style("opacity", 0);
        });
      }
    }
  });
};
