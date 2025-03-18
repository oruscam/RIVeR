import * as d3 from "d3";
import { COLORS } from "../../constants/constants";
import { getPositionSectionText } from "../../helpers";

interface drawSvgSectionLineProps {
  svgElement: SVGSVGElement;
  factor: number | { x: number; y: number };
  dirPoints: { x: number; y: number }[];
  sectionPoints: { x: number; y: number }[];
  name: string;
  isReport: boolean;
  imageWidth: number;
  imageHeight: number;
}

export const drawSvgSectionLine = ({
  svgElement,
  factor,
  dirPoints,
  sectionPoints,
  name,
  isReport,
  imageWidth,
  imageHeight,
}: drawSvgSectionLineProps) => {
  const svg = d3.select(svgElement);
  const resizeFactor = isReport ? 1.2 : 1;

  if (sectionPoints.length > 0) {
    svg
      .append("line")
      .attr(
        "x1",
        sectionPoints[0].x / (typeof factor === "number" ? factor : factor.x),
      )
      .attr(
        "y1",
        sectionPoints[0].y / (typeof factor === "number" ? factor : factor.y),
      )
      .attr(
        "x2",
        sectionPoints[1].x / (typeof factor === "number" ? factor : factor.x),
      )
      .attr(
        "y2",
        sectionPoints[1].y / (typeof factor === "number" ? factor : factor.y),
      )
      .attr("stroke", COLORS.YELLOW)
      .attr("stroke-width", 3.75 / resizeFactor)
      .attr("stroke-linecap", "round")
      .attr("stroke-dasharray", "5,10");
  }

  // Crear la línea de dirPoints o localPoints
  if (dirPoints.length > 0) {
    svg
      .append("line")
      .attr(
        "x1",
        dirPoints[0].x / (typeof factor === "number" ? factor : factor.x),
      )
      .attr(
        "y1",
        dirPoints[0].y / (typeof factor === "number" ? factor : factor.y),
      )
      .attr(
        "x2",
        dirPoints[1].x / (typeof factor === "number" ? factor : factor.x),
      )
      .attr(
        "y2",
        dirPoints[1].y / (typeof factor === "number" ? factor : factor.x),
      )
      .attr("stroke", COLORS.YELLOW)
      .attr("stroke-width", 4 / resizeFactor)
      .attr("stroke-linecap", "round");
  }

  // If not in report mode, add the section name as text to the SVG
  if (!isReport) {
    // Calculate the position and rotation for the section text
    const { point, rotation } = getPositionSectionText(
      sectionPoints[0],
      sectionPoints[1],
      imageWidth!,
      imageHeight!,
      factor as number,
    );
    // Append the section text element to the SVG
    svg
      .append("text")
      .attr("x", point.x / (typeof factor === "number" ? factor : factor.x))
      .attr("y", point.y / (typeof factor === "number" ? factor : factor.y))
      .attr("dy", 25)
      .text(name)
      .attr("font-size", 18 / resizeFactor)
      .attr("fill", COLORS.YELLOW)
      .attr(
        "transform",
        `rotate(${rotation}, ${point.x / (typeof factor === "number" ? factor : factor.x)}, ${point.y / (typeof factor === "number" ? factor : factor.y)})`,
      );
  }
};
