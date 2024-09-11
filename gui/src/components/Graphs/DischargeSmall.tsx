import { useEffect, useRef } from "react";
import * as d3 from 'd3'
import { useSectionSlice } from "../../hooks";


export const DischargeSmall = ({ width, height, index}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { sections  } = useSectionSlice();
    const { data } = sections[index];

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove();
        if (data) {
            const svg = d3.select(svgRef.current);
            const margin = { top: 20, right: 30, bottom: 40, left: 50 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const { distance, Q, Q_portion } = data;

            // Filter null values
            const filteredQ = Q.filter(d => d !== null);
            const filteredQPortion = Q_portion.filter(d => d !== null);

            // Create xScale for discharge
            const xScaleDischarge = d3.scaleBand()
                .domain(distance.map((d, i) => d))
                .range([margin.left, innerWidth - margin.right])
                .padding(0.4);

            // Create yScale for discharge
            const yScaleDischarge = d3.scaleLinear()
                .domain([d3.min(filteredQ)!, d3.max(filteredQ)!])
                .range([innerHeight, margin.top]);

            // Create yAxis for discharge
            const yAxisDischarge = d3.axisLeft(yScaleDischarge)
                .ticks(3)

            // Append yAxis for discharge
            svg.append('g')
                .attr('class', 'y-axis y-axis-2')
                .attr('transform', `translate(${margin.left}, 0)`)
                .call(yAxisDischarge);

            // Create bars for discharge
            svg.selectAll(".bar")
                .data(filteredQ)
                .enter()
                .append("rect")
                .attr("class", "bar")
                .attr("x", (_d, i) => xScaleDischarge(distance[i])!)
                .attr("y", d => yScaleDischarge(Math.max(0, d))) // Ajustar para valores negativos
                .attr("height", d => Math.abs(yScaleDischarge(d) - yScaleDischarge(0))) // Ajustar la altura de las barras
                .attr("width", xScaleDischarge.bandwidth())
                .attr("fill", (_d, i) => {
                    if (filteredQPortion[i] < 0.05) {
                        return 'green';
                    } else if (filteredQPortion[i] < 0.1) {
                        return 'yellow';
                    } else {
                        return 'red';
                    }
                });


            // label for Discharge
            svg.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'middle')
                .attr('x', (-innerHeight - 15) / 2)
                .attr('y', margin.left - 35)
                .attr('transform', 'rotate(-90)')
                .attr('fill', 'white')
                .text('Discharge');
        }
    }, [data, width, height]);

    return (
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"></svg>
    );
};