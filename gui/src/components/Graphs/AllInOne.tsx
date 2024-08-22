import { useEffect, useRef } from 'react'
import './graphs.css'
import bathParser from '../../helpers/bathimetryParser'
import * as d3 from 'd3'

/**
 * * Version 0.0.1
 * * Queda acomodar el código y adaptarlo para leer los datos desde .json.
 * * Pero la idea es que este componente muestre los tres gráficos en uno solo.
 * * Compartiendo el eje X.
 * * Acomodar los ejes Y para que se vean bien.
 * @returns 
 */

export const AllInOne = () => {
    const svgRef = useRef<SVGSVGElement>(null)
    const baseVelocity = [1, 5, 10, 16, 19, 22, 28, 25, 30, 36, 30, 19, 17];
    const velocity = Array.from({ length: 62 }, (_, i) => baseVelocity[i % baseVelocity.length]);
    
    const baseDischarge = [10, 10, 13, 16, 19, 22, 28, 22, 30, 36, 30, 19, 19]
    const discharge = Array.from({ length: 62 }, (_, i) => baseDischarge[i % baseDischarge.length]) 
    const level = 651

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        bathParser('/@fs/home/tomy_ste/Desktop/bath1.csv', 'csv').then(data => {
            if(svgRef.current){
                console.log(data)
                const svg = d3.select(svgRef.current)
                const width = +svg.attr('width')
                const height = +svg.attr('height')
                const margin = { top: 20, right: 30, bottom: 40, left: 50 }

                const xScale = d3.scaleLinear()
                    .domain([d3.min(data, d => d.x)!, d3.max(data, d => d.x)!])
                    .range([margin.left, width - margin.right])
                
                const yScale = d3.scaleLinear()
                    .domain([d3.min(data, d => d.y)!, d3.max(data, d => d.y)!])
                    .range([height - margin.bottom, 320])
                    
                const line = d3.line()
                .x(d => xScale(d.x))
                .y(d => yScale(d.y))

                const xAxis = d3.axisBottom(xScale).ticks(5)




                svg.append('g')
                    .attr('transform', `translate(0,${height - margin.bottom})`)
                    .call(xAxis)
                    .selectAll('.domain')

                svg.selectAll('.tick line')
                    .attr('stroke', 'lightgrey')
                    .attr('stroke-width', 0.2);
                
                const yScaleGrid = d3.scaleLinear().
                    domain([d3.min(data, d => d.y)!, d3.max(data, d => d.y)!]).
                    range([height - margin.bottom, margin.top]);


                const makeXGridlines = () => d3.axisBottom(xScale).ticks(5);
                const makeYGridlines = () => d3.axisLeft(yScaleGrid).ticks(25);
            
                svg.append('g')
                    .attr('class', 'grid')
                    .attr('transform', `translate(0,${height - margin.bottom})`)
                    .call(makeXGridlines()
                        .tickSize(-height + margin.top + margin.bottom)
                        .tickFormat('' as any))
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 0.05);
            
                svg.append('g')
                    .attr('class', 'grid')
                    .attr('transform', `translate(${margin.left},0)`)
                    .call(makeYGridlines()
                        .tickSize(-width + margin.left + margin.right)
                        .tickFormat('' as any))
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 0.05);

                
                
                const area = d3.area<{ x: number, y: number }>()
                    .x(d => xScale(d.x))
                    .y0(d => yScale(Math.min(d.y, level)))
                    .y1(_d => yScale(level));    
                
                svg.append('path')
                .datum(data)
                .attr('fill', 'grey')
                .attr('d', area);  

                svg.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(255,255,255,0.9)')
                .attr('stroke-width', 1.5)
                .attr('d', line);


                const yScale2 = d3.scaleLinear()
                    .domain([0, d3.max(velocity) as number])
                    .range([290, 190])

                const line2 = d3.line()
                    .x((d, i) => xScale(d.x))
                    .y((d, i) => yScale2(velocity[i]))

                svg.append('path')
                .datum(data)
                .attr('fill', 'none')
                .attr('stroke', 'rgba(255,255,255,0.9)')
                .attr('stroke-width', 1.5)
                .attr('d', line2);    
                
                const yScale3 = d3.scaleLinear()
                .domain([0, d3.max(discharge) as number])
                .nice()
                .range([160, margin.top]);
            
                const xScale2 = d3.scaleBand()
                    .domain(data.map((d, i) => d.x.toString()))
                    .range([margin.left, width - margin.right])
                    .padding(0.2);
                
                const bars = svg.selectAll("rect")
                .data(data)
                .enter().append("rect")
                .attr("x", (d, _i) => xScale2(d.x.toString())!)
                .attr("y", (_d, i) => yScale3(discharge[i]))
                .attr("height", (_d, i) => yScale3(0) - yScale3(discharge[i]))
                .attr("width", xScale2.bandwidth())
                .attr("fill", (_d, i) => {
                    if (i < 6 || i === 7 || i > 10) {
                        return '#62C655';
                    } else if (i === 6 || i === 10) {
                        return '#F5BF61';
                    } else {
                        return '#ED6B57';
                    }
                });

                svg.selectAll("rect")
                    .on("mouseover", (event, d) => {
                        svg.append("text")
                            .attr("class", "tooltip")
                            .attr("x", parseFloat(d3.select(event.currentTarget).attr("x")) + xScale2.bandwidth() / 2)
                            .attr("y", parseFloat(d3.select(event.currentTarget).attr("y")) - 5)
                            .attr("text-anchor", "middle")
                            .attr("fill", "white")
                            .text(discharge[parseInt(d.x)]);
                    })
                    .on("mouseout", () => {
                        svg.selectAll(".tooltip").remove();
                    });

                const yAxis1 = d3.axisLeft(yScale).ticks(5);
                const yAxis2 = d3.axisLeft(yScale2).ticks(5);
                const yAxis3 = d3.axisLeft(yScale3).ticks(5);
            
                svg.append('g')
                    .attr('class', 'y-axis y-axis-1')
                    .attr('transform', `translate(${margin.left},0)`)
                    .call(yAxis1);

                svg.append('g')
                    .attr('class', 'y-axis y-axis-2')
                    .attr('transform', `translate(${margin.left},0)`)
                    .call(yAxis2);

                svg.append('g')
                    .attr('class', 'y-axis y-axis-3')
                    .attr('transform', `translate(${margin.left},0)`)
                    .call(yAxis3);
            }
        })
    }, [])

  return (
    <div className='all-in-one-container'>
        <svg ref={svgRef} width={420} height={570}></svg>
    </div>
  )
}
