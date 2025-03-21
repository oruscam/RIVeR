import * as d3 from "d3";
import { calculateArrowWidth, calculateMultipleArrowsAdaptative } from "../../helpers";
import { SectionData } from "../../store/section/types";
import { calculateMultipleArrows } from "../../helpers/drawVectorsFunctions";

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
  globalMax: number,
) => {
  // Data for drawing the vectors
  const {
    east,
    north,
    streamwise_velocity_magnitude,
    distance,
    check,
    activeMagnitude,
    Q
  } = data;

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
    globalMax,
  );

  if (arrows === undefined) return;
  arrows.forEach((arrow, i) => {
    if (check[i] === false && interpolated === false) return null;

    // Crear el polígono para la flecha
    if ("points" in arrow && "color" in arrow) {
      const polygonPoints = arrow.points
        .map(
          (point: number[]) =>
            `${point[0] / (typeof factor === "number" ? factor : factor.x)},${point[1] / (typeof factor === "number" ? factor : factor.y)}`,
        )
        .join(" ");
      
      const polygon = svg
        .append("polygon")
        .attr("points", polygonPoints)
        .attr("fill", arrow.color)
        .attr("fill-opacity", 0.7)
        .attr("stroke", arrow.color)
        .attr("stroke-width", 1.5)
        .attr("stroke-width", 1.5)
        .attr("pointer-events", "all")
        .classed(`section-${sectionIndex}`, true);

      if (isReport == false && typeof factor === "number") {
        let textOffset = 10;
        if (arrow.points[2][1] > arrow.points[0][1]) {
          textOffset = -20;
        }

        polygon.on("mouseover", function () {
          polygon.attr("fill-opacity", 1); // Cambiar la opacidad del polígono al pasar el mouse
          svg
            .append("text")
            .attr("x", arrow.points[2][0] / factor) // Posicionar el texto en el centro del poligono
            .attr("y", arrow.points[2][1] / factor - textOffset) // Posicionar el texto arriba del polígono
            .attr("id", `tooltip-${i}`)
            .attr("text-anchor", "middle")
            .attr("font-size", "18px")
            .attr("font-weight", "600")
            .attr("fill", arrow.color)
            .text(arrow.magnitude!.toFixed(2));
        });

        polygon.on("mouseout", function () {
          polygon.attr("fill-opacity", 0.7); // Resetear la opacidad
          d3.select(`#tooltip-${i}`).remove(); // Eliminar el texto al salir el mouse
        });
      }
    }
  });
};
