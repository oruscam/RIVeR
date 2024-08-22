import * as d3 from 'd3'
import { useEffect, useRef } from 'react'

export const Discharge = () => {
    const svgRef = useRef<SVGSVGElement>(null)
    const data = [10, 10, 13, 16, 19, 22, 28, 22, 30, 36, 30, 19, 19]
    const xdata = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]

    
    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if (svgRef.current) {
            const svg = d3.select(svgRef.current);
            const width = +svg.attr('width')
            const height = +svg.attr('height')
            const margin = { top: 8, right: 30, bottom: 5, left: 40 };

            const x = d3.scaleBand()
                .domain(xdata.map((_d, i) => i.toString()))
                .range([margin.left, width - margin.right])
                .padding(0.4);

            const y = d3.scaleLinear()
                .domain([0, d3.max(data) as number])
                .nice()
                .range([height - margin.bottom, margin.top]);

            const bars = svg.append("g")
                .selectAll("rect")
                .data(data)
                .enter().append("rect")
                .attr("x", (d, i) => x(i.toString())!)
                .attr("y", d => y(d))
                .attr("height", d => y(0) - y(d))
                .attr("width", x.bandwidth())
                .attr("fill", (_d, i) => {
                    if ( i < 6 || i === 7 || i > 10){
                        return '#62C655'
                    } else if ( i === 6 || i === 10){
                        return '#F5BF61'
                    } else {
                        return '#ED6B57'
                    }
                })

            .on("mouseover", (event, d) => {
                svg.append("text")
                    .attr("class", "tooltip")
                    .attr("x", parseFloat(d3.select(event.currentTarget).attr("x")) + x.bandwidth() / 2)
                    .attr("y", parseFloat(d3.select(event.currentTarget).attr("y")) - 5)
                    .attr("text-anchor", "middle")
                    .attr("fill", "white")
                    .text(d);
            })
            .on("mouseout", () => {
                svg.selectAll(".tooltip").remove();
            })

            svg.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'start')
                .attr('x', -height + margin.bottom)
                .attr('y', margin.left / 2)
                .attr('dy', '.75em')
                .attr('transform', 'rotate(-90)')
                .attr('fill', 'white')
                .text('Discharge');
        }
    }, [data]);

  return (
    <div className="graph-container">
        <svg ref={svgRef} width="420" height="150" id='discharge'></svg>
    </div>
  )
}