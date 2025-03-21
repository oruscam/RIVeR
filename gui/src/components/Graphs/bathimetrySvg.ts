import * as d3 from "d3";
import { COLORS, GRAPHS } from "../../constants/constants";
import { Point } from "../../types";
import { generateXAxisTicks, generateYAxisTicks } from "../../helpers";
import { t } from "i18next";

/**
 * Creates a bathymetry chart on the specified SVG element.
 * @param svgElement - The SVG element to create the chart on.
 * @param data - An array of data points for the chart.
 * @param level - The level value for shading the area between the horizontal line and the original graph.
 *
 */

interface BathimetryChartProps {
  svgElement: SVGSVGElement;
  data: Point[];
  level?: number;
  showLeftBank: boolean;
  leftBank?: number;
  rightBank?: number;
  xScaleAllInOne?: d3.ScaleLinear<number, number>;
  sizes?: {
    width: number;
    height: number;
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    graphHeight: number;
  };
  isReport?: boolean;
  x1Intersection?: number;
  x2Intersection?: number;
}

export const bathimetrySvg = ({
  svgElement,
  data,
  level = 0,
  showLeftBank,
  leftBank,
  rightBank,
  xScaleAllInOne,
  sizes,
  isReport = false,
  x1Intersection,
  x2Intersection,
}: BathimetryChartProps) => {
  const svg = d3.select(svgElement);
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };

  const xMin = d3.min(data, (d) => d.x)!;
  const xMax = d3.max(data, (d) => d.x)!;

  const yMin = d3.min(data, (d) => d.y)!;
  const yMax = d3.max(data, (d) => d.y)!;

  let xScale;
  let yScale;

  let clipPathData = data;
  let translateX = 0;

  if (xScaleAllInOne && sizes) {
    const { margin: marginAllInOne, height: heightSizes, graphHeight } = sizes;
    xScale = xScaleAllInOne;

    yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([heightSizes - marginAllInOne.bottom - 30, graphHeight * 2 - 10]);

    svg
      .append("text")
      .attr("class", "y-axis-label")
      .attr("text-anchor", "end")
      .attr("x", isReport ? -graphHeight * 3 + 160 : -graphHeight * 3 + 180)
      .attr("y", sizes.margin.left - 30)
      .attr("transform", "rotate(-90)")
      .attr("fill", "white")
      .attr("font-size", "22px")
      .text(t("Graphs.stage"));

    translateX = marginAllInOne.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE;
  } else {
    xScale = d3
      .scaleLinear()
      .domain([xMin, xMax])
      .range([margin.left + 10, width - margin.right]);

    yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([height - margin.bottom, margin.top]);

    svg
      .append("text")
      .attr("class", "y-axis-label")
      .attr("text-anchor", "end")
      .attr("x", -height / 2 + margin.bottom)
      .attr("dy", ".75em")
      .attr("transform", "rotate(-90)")
      .attr("fill", "white")
      .attr("font-size", "22px")
      .text(t("Graphs.stage"));

    // Añado eje x solo si no es all in one

    const ticks = generateXAxisTicks(xMin, xMax, xMax - xMin);

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(ticks)
      .tickFormat(d3.format(".1f"));

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .selectAll(".tick text")
      .style("font-size", "14px");

    translateX = margin.left + GRAPHS.GRID_Y_OFFSET_BATHIMETRY;

    if (x1Intersection && x2Intersection) {
      clipPathData = data.filter(
        (d) => d.x >= x1Intersection && d.x <= x2Intersection,
      );
      clipPathData.unshift({ x: x1Intersection, y: level });
      clipPathData.push({ x: x2Intersection, y: level });
    }
  }

  const line = d3
    .line<Point>()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  // Create and add Y ticks
  const ticks = generateYAxisTicks(undefined, yMin, yMax);

  const yAxis = d3
    .axisLeft(yScale)
    .tickValues(ticks)
    .tickFormat(d3.format(".2f"));

  svg
    .append("g")
    .attr("transform", `translate(${translateX},0)`)
    .call(yAxis)
    .selectAll(".tick text")
    .style("font-size", "14px");

  svg
    .selectAll(".tick line")
    .attr("stroke", "lightgrey")
    .attr("stroke-width", 0.2);

  // Create and add Y gridlines

  const makeYGridlines = () => d3.axisLeft(yScale).tickValues(ticks);

  svg
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${translateX},0)`)
    .call(
      makeYGridlines()
        .tickSize(
          xScaleAllInOne
            ? -width + margin.left + margin.right * 2 - 10
            : -width + margin.left + margin.right,
        )
        .tickFormat("" as any),
    )
    .attr("stroke", "grey")
    .attr("stroke-width", 0.15);

  // Sombrear el área entre la línea horizontal y la gráfica original
  const area = d3
    .area<{ x: number; y: number }>()
    .x((d) => xScale(d.x))
    .y0((d) => yScale(Math.min(d.y, level)))
    .y1((_d) => yScale(level));

  // Definir clip-path
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", `clip-bathimetry-${svgElement.id}`)
    .append("path")
    .datum(clipPathData)
    .attr("d", line);

  svg
    .append("path")
    .datum(clipPathData)
    .attr("fill", COLORS.TRANSPARENT_WHITE)
    .attr("d", area)
    .attr("clip-path", `clip-bathimetry-${svgElement.id}`); // Aplicar clip-path

  // Añadir etiquetas de valor a los ejes

  svg
    .append("text")
    .attr("class", "x-axis-label")
    .attr("x", width / 2 - margin.right)
    .attr("y", height - 5)
    .attr("fill", "white")
    .attr("font-size", "22px")
    .text(t("Graphs.station"));

  // Bathymetry line
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", COLORS.WHITE)
    .attr("stroke-width", 1.5)
    .attr("d", line);

  if (
    showLeftBank &&
    leftBank !== undefined &&
    rightBank !== undefined &&
    leftBank !== rightBank
  ) {
    svg
      .append("path")
      .attr("d", "M -8 0 L 8 0 L 0 16 Z")
      .attr("fill", COLORS.RED)
      .attr(
        "transform",
        `translate(${xScale(leftBank)}, ${yScale(level) - 16})`,
      );

    svg
      .append("path")
      .attr("d", "M -8 0 L 8 0 L 0 16 Z")
      .attr("fill", COLORS.GREEN)
      .attr(
        "transform",
        `translate(${xScale(rightBank)}, ${yScale(level) - 16})`,
      );
  }
};
