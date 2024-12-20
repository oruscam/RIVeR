import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSectionSlice } from "../hooks";
import { COLORS } from '../constants/constants';
import { calculateMidpointAndAngle } from '../helpers';

// This component renders a section line within an SVG element.
// It ensures the section line is visible even when embedded in HTML.
// The section line is drawn using D3.js based on provided section and direction points.

interface SvgSectionLineProps {
  factor: number | { x: number, y: number };
  index: number;
  isReport: boolean;
}

export const SvgSectionLine = ({ factor, index, isReport } : SvgSectionLineProps) => {
  const { sections } = useSectionSlice();
  const { dirPoints, sectionPoints, name } = sections[index];
  const svgRef = useRef(null);

  const resizeFactor = isReport ? 1.2 : 1;

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    // Limpiar el SVG antes de redibujar
    svg.selectAll("*").remove();

    // Crear la línea de sectionPoints
    if (sectionPoints.length > 0) {
      svg.append("line")
        .attr("x1", sectionPoints[0].x / (typeof factor === 'number' ? factor : factor.x))
        .attr("y1", sectionPoints[0].y / (typeof factor === 'number' ? factor : factor.y))
        .attr("x2", sectionPoints[1].x / (typeof factor === 'number' ? factor : factor.x))
        .attr("y2", sectionPoints[1].y / (typeof factor === 'number' ? factor : factor.y))
        .attr("stroke", COLORS.YELLOW)
        .attr("stroke-width", 4 / resizeFactor)
        .attr("stroke-linecap", "round")
        .attr("stroke-dasharray", "5,10");
    }

    // Crear la línea de dirPoints o localPoints
    if (dirPoints.length > 0) {
        svg.append("line")
          .attr("x1", dirPoints[0].x / (typeof factor === 'number' ? factor : factor.x))
          .attr("y1", dirPoints[0].y / (typeof factor === 'number' ? factor : factor.y))
          .attr("x2", dirPoints[1].x / (typeof factor === 'number' ? factor : factor.x))
          .attr("y2", dirPoints[1].y / (typeof factor === 'number' ? factor : factor.x))
          .attr("stroke", COLORS.YELLOW)
          .attr("stroke-width", 4 / resizeFactor)
          .attr("stroke-linecap", "round")
      }
     
    if ( !isReport ){
      const { midpoint, angle } = calculateMidpointAndAngle(sectionPoints[0], sectionPoints[1]);
      svg.append("text")
      .attr("x", midpoint.x / (typeof factor === 'number' ? factor : factor.x))
      .attr("y", midpoint.y / (typeof factor === 'number' ? factor : factor.y))
      .attr("dy", 25)
      .text(name)
      .attr("font-size", 18)
      .attr("font-weight", 500)
      .attr("fill", COLORS.YELLOW)
      .attr("transform", `rotate(${angle}, ${midpoint.x / (typeof factor === 'number' ? factor : factor.x)}, ${midpoint.y / (typeof factor === 'number' ? factor : factor.y)})`);

    }  

  }, [factor, resizeFactor, sectionPoints, dirPoints, isReport]);

  return (
    <svg id="svg-section-line" ref={svgRef} width="100%" height="100%"></svg>
  );
};