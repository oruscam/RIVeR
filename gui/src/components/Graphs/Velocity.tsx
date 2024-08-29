import { useEffect, useRef } from "react"
import * as d3 from 'd3'

export const Velocity = ({lineColor}: {lineColor: string}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const x = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]
  const y = [1, 5, 10, 16, 19, 22, 28, 25, 30, 36, 30, 19, 17]

  useEffect(() => {
    d3.select(svgRef.current).selectAll('*').remove()
    if(svgRef.current){
      const svg = d3.select(svgRef.current)
      const width = +svg.attr('width')
      const height = +svg.attr('height')
      const margin = { top: 10, right: 30, bottom: 5, left: 40 }

      const xScale = d3.scaleLinear()
        .domain([d3.min(x) as number -2 , d3.max(x) as number])
        .range([margin.left, width - margin.right])

      const yScale = d3.scaleLinear()
        .domain([0, d3.max(y) as number])
        .range([height - margin.bottom, margin.top])

      const line = d3.line<number>()
        .x((d, i) => xScale(x[i]))
        .y((d, i) => yScale(y[i]))

      svg.append("path")
        .datum(y)
        .attr("fill", "none")
        .attr("stroke", lineColor)
        .attr("stroke-width", 2)
        .attr("d", line)

      const focus = svg.append("g")
        .style("display", "none")

      focus.append("circle")
        .attr("r", 4.5)
        .attr("fill", lineColor)

      focus.append("text")
        .attr("x", 9)
        .attr("dy", ".35em")
        .attr("fill", lineColor)

      svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mouseover", () => focus.style("display", null))
        .on("mouseout", () => focus.style("display", "none"))
        .on("mousemove", function(event) {
          const bisect = d3.bisector((d: number) => d).left
          const x0 = xScale.invert(d3.pointer(event)[0])
          const i = bisect(x, x0, 1)
          const d0 = x[i - 1]
          const d1 = x[i]
          const d = x0 - d0 > d1 - x0 ? d1 : d0
          const yValue = y[x.indexOf(d)]
          if (yValue !== undefined) {
            focus.attr("transform", `translate(${xScale(d)},${yScale(yValue)})`)
            focus.select("text").text(`(${d}, ${yValue})`)
          }
        })

      svg.append('text')
        .attr('class', 'y-axis-label')
        .attr('text-anchor', 'start')
        .attr('x', -height + margin.bottom)
        .attr('y', margin.left / 2 )
        .attr('dy', '.75em')
        .attr('transform', 'rotate(-90)')
        .attr('fill', lineColor)
        .text('Velocity');
    }
  }, [x, y])

  return (
    <div className="graph-container">
      <svg ref={svgRef} width="420" height="100"></svg>
    </div>
  )
}