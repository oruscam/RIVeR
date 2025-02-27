import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './components.css'
import { useDataSlice } from '../hooks'
import { COLORS, VECTORS } from '../constants/constants';

interface QuiverProps {
  width: number;
  height: number;
  factor: number;
  showMedian?: boolean;
}

export const Quiver = ({ width, height, factor, showMedian }: QuiverProps) => {
  const svgRef = useRef(null)
  const { images, quiver } = useDataSlice();

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Limpiar el SVG antes de dibujar
    
    if (!quiver) return;

    const { x, y, u, v, u_median, v_median } = quiver;

    svg.attr("width", width)
       .attr("height", height)
       .style("background-color", "transparent");

    const filteredData = x.map((d, i) => ({
      x: d !== null ? d : -1000,
      y: y[i],
      u: showMedian ? (u_median ? u_median[i] : null) : (Array.isArray(u[0]) ? u[images.active][i] : u[i]),
      v: showMedian ? (v_median ? v_median[i] : null) : (Array.isArray(v[0]) ? v[images.active][i] : v[i])
    })).filter(d => d.u !== null && !isNaN(d.u) && d.v !== null && !isNaN(d.v));

    const max_u = d3.max(filteredData, d => Math.abs(d.u));
    const max_v = d3.max(filteredData, d => Math.abs(d.v));

    const mean_u = (max_u!) / 2;
    const mean_v = (max_v!) / 2;



    svg.selectAll('line')
      .data(filteredData)
      .enter()
      .append('line')
        .attr('x1', d => d.x / factor)
        .attr('y1', d => d.y / factor)
        .attr('x2', d => d.x / factor + (d.u * Math.abs(mean_u - VECTORS.QUIVER_AMPLITUDE_FACTOR )) / factor)
        .attr('y2', d => d.y / factor + (d.v * Math.abs(mean_v - VECTORS.QUIVER_AMPLITUDE_FACTOR )) / factor)
        .attr('stroke', COLORS.BLUE)
        .attr('stroke-width', 1.8)
        .attr('marker-end', 'url(#arrow)')

    // Definir la forma de la flecha
    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 1)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto-start-reverse")
        .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .attr("fill", COLORS.BLUE)
  }, [quiver, images.active, showMedian, factor])

  return (
    <svg ref={svgRef} className='quiver' style={{width: `${width}`, height: `${height}`}}></svg>
  )
}
