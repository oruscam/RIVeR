import * as d3 from "d3";
import { GRAPHS, COLORS } from "../../constants/constants";
import { generateYAxisTicks } from "../../helpers";

interface CreateDischargeChartProps {
  sizes: {
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
  SVGElement: SVGSVGElement;
  distance: number[];
  Q: (number | null)[];
  QPortion: number[];
  isReport?: boolean;
  xScale: d3.ScaleLinear<number, number>;
}

export const createDischargeChart = ({
  SVGElement,
  distance,
  Q,
  QPortion,
  sizes,
  isReport = false,
  xScale,
}: CreateDischargeChartProps) => {
  const svg = d3.select(SVGElement);
  const { width, margin, graphHeight } = sizes;

  const bandwidth =
    (width - margin.left - 40 - margin.right) / distance.length -
    GRAPHS.BAR_PADDING;

  const yScale = d3
    .scaleLinear()
    .domain([
      d3.min(Q.filter((d) => d !== null))! > 0
        ? 0
        : d3.min(Q.filter((d) => d !== null))!,
      d3.max(Q.filter((d) => d !== null))!,
    ])
    .range([
      graphHeight + (isReport ? -15 : -50),
      margin.top + (isReport ? 25 : 25),
    ]);

  // Create and add Y ticks

  const ticks = generateYAxisTicks(Q);

  const yAxis = d3.axisLeft(yScale).tickValues(ticks);

  svg
    .append("g")
    .attr("class", "y-axis y-axis-1")
    .attr(
      "transform",
      `translate(${margin.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE},0)`,
    )
    .call(yAxis)
    .selectAll(".tick text")
    .style("font-size", "14px");

  // Create and add Y gridlines

  const makeYGridlines = () =>
    d3.axisLeft(yScale).tickValues(ticks).tickFormat(d3.format(".2f"));

  svg
    .append("g")
    .attr("class", "grid")
    .attr(
      "transform",
      `translate(${margin.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE},0)`,
    )
    .call(
      makeYGridlines()
        .tickSize(-width + margin.left + margin.right * 2)
        .tickFormat("" as any),
    )
    .attr("stroke", "grey")
    .attr("stroke-width", 0.15);

  const filteredQ = Q.map((d, i) => ({
    distance: distance[i],
    discharge: d,
    QPortion: QPortion[i],
  })).filter((d) => d.discharge !== null);

  // Append Bars
  svg
    .selectAll(".bar")
    .data(filteredQ)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("data-x", (d) => d.distance.toFixed(2))
    .attr("x", (d) => xScale(d.distance) - bandwidth / 2) // Ajustar la posición de las barras
    .attr("y", (d) => yScale(Math.max(0, d.discharge))) // Ajustar para valores negativos
    .attr("height", (d) => Math.abs(yScale(d.discharge) - yScale(0))) // Ajustar la altura de las barras
    .attr("width", bandwidth) // Ajustar el ancho de las barras
    .attr("fill", (d) => {
      if (d.QPortion === 0) {
        return COLORS.BLUE;
      } else {
        if (d.QPortion < 0.05) {
          return COLORS.GREEN;
        } else if (d.QPortion < 0.1) {
          return COLORS.YELLOW;
        }
        return COLORS.RED;
      }
    });

  if (isReport) {
    // Add legends
    const legendGroup = svg
      .append("g")
      .attr("class", "legend-group")
      .attr("transform", `translate(${margin.left + 40}, ${margin.top})`);

    legendGroup
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", COLORS.GREEN);

    legendGroup
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .attr("fill", "white")
      .text("Q < 5%");

    legendGroup
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("x", 90)
      .attr("fill", COLORS.YELLOW);

    legendGroup
      .append("text")
      .attr("x", 110)
      .attr("y", 12)
      .attr("fill", "white")
      .text("5% < Q < 10%");

    legendGroup
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("x", 220)
      .attr("fill", COLORS.RED);

    legendGroup
      .append("text")
      .attr("x", 240)
      .attr("y", 12)
      .attr("fill", "white")
      .text("Q > 10%");
  }

  // Add tooltip to bars
  svg
    .selectAll(".bar")
    .on("mouseover", (event, d) => {
      const xValue = d3.select(event.currentTarget).attr("data-x"); // Asumiendo que tienes un atributo data-x con el valor de x
      const yValue = d.discharge.toFixed(2);

      svg
        .append("text")
        .attr("class", "tooltip")
        .attr(
          "x",
          parseFloat(d3.select(event.currentTarget).attr("x")) + bandwidth / 2,
        )
        .attr("y", parseFloat(d3.select(event.currentTarget).attr("y")) - 25)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "16px")
        .style("font-weight", "500")
        .text(`Discharge: ${yValue}`);

      svg
        .append("text")
        .attr("class", "tooltip")
        .attr(
          "x",
          parseFloat(d3.select(event.currentTarget).attr("x")) + bandwidth / 2,
        )
        .attr("y", parseFloat(d3.select(event.currentTarget).attr("y")) - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "16px")
        .style("font-weight", "500")
        .text(`Distance: ${xValue}`);
    })
    .on("mouseout", () => {
      svg.selectAll(".tooltip").remove();
    });

  // Label
  svg
    .append("text")
    .attr("class", "y-axis-label")
    .attr("text-anchor", "middle")
    .attr("x", -graphHeight + (isReport ? 75 : 115))
    .attr("y", margin.left - 30)
    .attr("transform", "rotate(-90)")
    .attr("fill", "white")
    .attr("font-size", "22px")
    .text("Discharge");
};
