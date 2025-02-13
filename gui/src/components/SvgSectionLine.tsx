import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useSectionSlice, useUiSlice } from "../hooks";
import { COLORS } from '../constants/constants';
import { getPositionSectionText } from '../helpers';

// This component renders a section line within an SVG element.
// It ensures the section line is visible even when embedded in HTML.
// The section line is drawn using D3.js based on provided section and direction points.

interface SvgSectionLineProps {
  factor: number | { x: number, y: number };
  index: number;
  isReport: boolean;
}

export const SvgSectionLine = ({ factor, index, isReport } : SvgSectionLineProps) => {
  const svgRef = useRef(null);
  const { sections } = useSectionSlice();
  const { screenSizes } = useUiSlice()
  const { dirPoints, sectionPoints, name } = sections[index];
  const { imageWidth, imageHeight } = screenSizes

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
    
    
    // If not in report mode, add the section name as text to the SVG
    if (!isReport) {
      // Calculate the position and rotation for the section text
      const { point, rotation } = getPositionSectionText(sectionPoints[0], sectionPoints[1], imageWidth!, imageHeight!, factor as number);
      console.log( name, rotation)
      // Append the section text element to the SVG
      svg.append("text")
      .attr("x", point.x / (typeof factor === 'number' ? factor : factor.x))
      .attr("y", point.y / (typeof factor === 'number' ? factor : factor.y))
      .attr("dy", 25)
      .text(name)
      .attr("font-size", 18 / resizeFactor)
      .attr("fill", COLORS.YELLOW)
      .attr("transform", `rotate(${rotation}, ${point.x / (typeof factor === 'number' ? factor : factor.x)}, ${point.y / (typeof factor === 'number' ? factor : factor.y)})`);
    }

  }, [factor, resizeFactor, sectionPoints, dirPoints, isReport]);

  return (
    <svg id="svg-section-line" ref={svgRef} width="100%" height="100%"></svg>
  );
};

