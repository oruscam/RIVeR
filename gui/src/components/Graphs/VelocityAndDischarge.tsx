import { useEffect, useRef } from 'react'
import './graphs.css'
import * as d3 from 'd3'
import { useSectionSlice } from '../../hooks'
import { GREEN, RED, YELLOW } from '../../constants/constants'

/**
 * * Version 0.0.1
 * * 
 * @returns 
 */

export const VelocityAndDischarge = ({ width, height } : {width?: number, height?: number}) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { sections, activeSection } = useSectionSlice();
    
    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        const { data } = sections[activeSection]
            if(data){
                
                const svg = d3.select(svgRef.current)
                const width = +svg.attr('width')
                const height = +svg.attr('height')
                const margin = { top: 20, right: 30, bottom: 40, left: 50 }
                
                const { distance, streamwise_magnitude, plus_std, minus_std, percentile_95th, percentile_5th, Q, Q_portion } = data

                // Filter null values

                const filteredStreamwiseMagnitude = streamwise_magnitude.filter(d => d !== null).map(Number);
                const filteredPlusStd = plus_std.filter(d => d !== null);
                const filteredMinusStd = minus_std.filter(d => d !== null);
                const filteredPercentile_95th = percentile_95th.filter(d => d !== null);
                const filteredPercentile_5th = percentile_5th.filter(d => d !== null);
                const filteredQ = Q.filter(d => d !== null);
                const filteredQPortion = Q_portion.filter(d => d !== null);

                // xScale for velocity and discharge

                const xScale = d3.scaleLinear()
                    .domain([d3.min(distance)!, d3.max(distance)!])
                    .range([margin.left, width - margin.right]) 

                // yScaleVelocity for velocity fields

                const minDomainValue = Math.min(d3.min(filteredPercentile_5th)!, d3.min(filteredMinusStd)!);
                const maxDomainValue = Math.max(d3.max(filteredPercentile_95th)!, d3.max(filteredPlusStd)!);

                const yScaleVelocity = d3.scaleLinear()
                    .domain([minDomainValue, maxDomainValue])
                    .range([height - margin.bottom, 200]);

                // Main line for velocity 

                const line = d3.line()
                    .x((_d, i) => xScale(distance[i]))
                    .y((d, _i) => yScaleVelocity(d))

                // std area

                const areaStd = d3.area<number>()
                    .x((_d, i) => xScale(distance[i]))
                    .y0((_d, i) => yScaleVelocity(filteredPlusStd[i]))
                    .y1((_d, i) => yScaleVelocity(filteredMinusStd[i]))

                // Percentile 95 and 5 area

                const areaPercentile = d3.area<number>()
                    .x((_d, i) => xScale(distance[i]))
                    .y0((_d, i) => yScaleVelocity(filteredPercentile_5th[i]))
                    .y1((_d, i) => yScaleVelocity(filteredPercentile_95th[i]))

                // Common xAxis

                const xAxis = d3.axisBottom(xScale).ticks(5)

                // Append xAxis

                svg.append('g')
                    .attr('transform', `translate(0,${height - margin.bottom})`)
                    .call(xAxis)
                    .selectAll('.domain')

                svg.selectAll('.tick line')
                    .attr('stroke', 'lightgrey')
                    .attr('stroke-width', 0.2);

                // Create yGrid    
                
                const yScaleGrid = d3.scaleLinear()
                    .domain([d3.min(filteredStreamwiseMagnitude)!, d3.max(filteredStreamwiseMagnitude)!])
                    .range([height - margin.bottom, margin.top]);

                const makeXGridlines = () => d3.axisBottom(xScale).ticks(5);
                const makeYGridlines = () => d3.axisLeft(yScaleGrid).ticks(8);

                // Add xGrid

                svg.append('g')
                    .attr('class', 'grid')
                    .attr('transform', `translate(0,${height - margin.bottom})`)
                    .call(makeXGridlines()
                        .tickSize(-height + margin.top + margin.bottom)
                        .tickFormat('' as any))
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 0.05);

                // Add yGrid
                
                svg.append('g')
                    .attr('class', 'grid')
                    .attr('transform', `translate(${margin.left},0)`)
                    .call(makeYGridlines()
                        .tickSize(-width + margin.left + margin.right)
                        .tickFormat('' as any))
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 0.05);

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
                
                // Create xScale for discharge
                
                const xScaleDischarge = d3.scaleBand()
                    .domain(distance.map((d, i) => d))
                    .range([margin.left, width - margin.right])
                    .padding(0.4);

                // Create yScale for discharge
                const yScaleDischarge = d3.scaleLinear()
                    .domain([d3.min(filteredQ)!, d3.max(filteredQ)!])
                    .range([180, margin.top]);

                // Create yAxis for discharge
                const yAxisDischarge = d3.axisLeft(yScaleDischarge)
                    .ticks(5)
                    .tickPadding(4);

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
                        if ( filteredQPortion[i] < 0.05) {
                            return GREEN;
                        } else if (filteredQPortion[i] < 0.1) {
                            return YELLOW;
                        } else  {
                            return RED;
                        }
                    });

                // Add tooltip to bars
                svg.selectAll(".bar")
                    .on("mouseover", (event, d) => {
                        svg.append("text")
                            .attr("class", "tooltip")
                            .attr("x", parseFloat(d3.select(event.currentTarget).attr("x")) + xScaleDischarge.bandwidth() / 2)
                            .attr("y", parseFloat(d3.select(event.currentTarget).attr("y")) - 5)
                            .attr("text-anchor", "middle")
                            .attr("fill", "white")
                            .text(d.toFixed(2));
                    })
                    .on("mouseout", () => {
                        svg.selectAll(".tooltip").remove();
                    });
                
                // label for Discharge

                svg.append('text')
                    .attr('class', 'y-axis-label')
                    .attr('text-anchor', 'middle')
                    .attr('x', - height + 280)
                    .attr('y', margin.left - 35)
                    .attr('transform', 'rotate(-90)')
                    .attr('fill', 'white')
                    .text('Discharge');

                
                // label for Velocity

                svg.append('text')
                    .attr('class', 'y-axis-label')
                    .attr('text-anchor', 'middle')
                    .attr('x', - height + 110)
                    .attr('y', margin.left - 35)
                    .attr('transform', 'rotate(-90)')
                    .attr('fill', 'white')
                    .text('Velocity');

            }
    }, [activeSection])

  return (
    <div className='all-in-one-container mt-1'>
        <svg ref={svgRef} width={450} height={380}></svg>
    </div>
  ) 
}

