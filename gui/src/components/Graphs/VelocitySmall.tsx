import { useEffect, useRef } from "react";
import { useSectionSlice } from "../../hooks";
import * as d3 from 'd3'


export const VelocitySmall = ({ width, height, index }) => {    
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

            const { distance, streamwise_magnitude, plus_std, minus_std, percentile_95th, percentile_5th } = data;

            // Filter null values
            const filteredStreamwiseMagnitude = streamwise_magnitude.filter(d => d !== null).map(Number);
            const filteredPlusStd = plus_std.filter(d => d !== null);
            const filteredMinusStd = minus_std.filter(d => d !== null);
            const filteredPercentile_95th = percentile_95th.filter(d => d !== null);
            const filteredPercentile_5th = percentile_5th.filter(d => d !== null);

            // xScale for velocity
            const xScale = d3.scaleLinear()
                .domain([d3.min(distance)!, d3.max(distance)!])
                .range([margin.left, innerWidth - margin.right]);

            // yScaleVelocity for velocity fields
            const minDomainValue = Math.min(d3.min(filteredPercentile_5th)!, d3.min(filteredMinusStd)!);
            const maxDomainValue = Math.max(d3.max(filteredPercentile_95th)!, d3.max(filteredPlusStd)!);

            const yScaleVelocity = d3.scaleLinear()
                .domain([minDomainValue, maxDomainValue])
                .range([innerHeight, margin.top]);

            // Main line for velocity
            const line = d3.line()
                .x((_d, i) => xScale(distance[i]))
                .y((d, _i) => yScaleVelocity(d));

            // std area
            const areaStd = d3.area<number>()
                .x((_d, i) => xScale(distance[i]))
                .y0((_d, i) => yScaleVelocity(filteredPlusStd[i]))
                .y1((_d, i) => yScaleVelocity(filteredMinusStd[i]));

            // Percentile 95 and 5 area
            const areaPercentile = d3.area<number>()
                .x((_d, i) => xScale(distance[i]))
                .y0((_d, i) => yScaleVelocity(filteredPercentile_5th[i]))
                .y1((_d, i) => yScaleVelocity(filteredPercentile_95th[i]));

            // Common xAxis
            const xAxis = d3.axisBottom(xScale).ticks(5);

            // Append xAxis
            svg.append('g')
                .attr('transform', `translate(0,${innerHeight})`)
                .call(xAxis)
                .selectAll('.domain');

            svg.selectAll('.tick line')
                .attr('stroke', 'lightgrey')
                .attr('stroke-width', 0.2);



            // Add the velocity line    
            svg.append('path')
                .datum(filteredStreamwiseMagnitude)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(255,255,255,1)')
                .attr('stroke-width', 2)
                .attr('d', line);

            // Add the percentile area
            svg.append('path')
                .datum(filteredPercentile_95th)
                .attr('fill', 'rgb(237, 107, 87, 0.4)')
                .attr('d', areaPercentile);

            // Add the std area
            svg.append('path')
                .datum(filteredPlusStd)
                .attr('fill', 'rgb(51, 150, 191, 0.4)')
                .attr('d', areaStd);

            // Create yAxis for velocity graphs
            const yAxisVelocity = d3.axisLeft(yScaleVelocity)
                .ticks(5)
                .tickPadding(5);

            // Append yAxis for velocity graphs
            svg.append('g')
                .attr('class', 'y-axis y-axis-1')
                .attr('transform', `translate(${margin.left},0)`)
                .call(yAxisVelocity);

            // label for Velocity
            svg.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'middle')
                .attr('x', -innerHeight / 2)
                .attr('y', margin.left - 35)
                .attr('transform', 'rotate(-90)')
                .attr('fill', 'white')
                .text('Velocity');
        }
    }, [data, width, height]);

    return (
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"></svg>
    );
};
