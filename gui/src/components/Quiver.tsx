import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import './components.css'
import { useDataSlice } from '../hooks'
import { QUIVERS_AMPLITUDE_FACTOR } from '../constants/constants';

interface QuiverProps {
  width: number;
  height: number;
  factor: number;
  showMedian?: boolean;
}

export const Quiver = ({ width, height, factor, showMedian }: QuiverProps) => {
  const svgRef = useRef(null)
  const { images, quiver } = useDataSlice();

  useEffect(() =>{
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Limpiar el SVG antes de dibujar
    // if (processing.error) {
    //   onSetErrorMessage({message: processing.error});
    //   return;
    // }
    
    if (!quiver) return;

    const { x, y, u, v, typevector, u_median, v_median } = quiver;


    svg.attr("width", width)
       .attr("height", height)
       .style("background-color", "transparent");

    const filteredXTable = x.map((d, i) => typevector[i] === 1 ? d : -10000); 
    
    let uTable: number[];
    let vTable: number[];

    if( showMedian ){
      uTable = u_median || [];
      vTable = v_median || [];
    }else {
      if( Array.isArray(u[0]) ){
        uTable = u[images.active] as number[];
        vTable = v[images.active] as number[];
      } else {
        uTable = u as number[];
        vTable = v as number[];
      }
    }

    svg.selectAll('line')
      .data(filteredXTable)
      .enter()
      .append('line')
        .attr('x1', (_d: number, i: number) => filteredXTable[i] / factor)
        .attr('y1', (_d: number, i: number) => y[i] / factor)
        .attr('x2', (_d: number, i: number) => {
          if (isNaN(uTable[i])) return null;
          return filteredXTable[i] / factor + uTable[i] * QUIVERS_AMPLITUDE_FACTOR;
        })
        .attr('y2', (_d: number, i: number) => {
          if (isNaN(vTable[i])) return null;
          return y[i] / factor + vTable[i] * QUIVERS_AMPLITUDE_FACTOR;
        })
        .attr('stroke', '#0678BE')
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
        .attr("fill", "#0678BE")
  }, [quiver, images.active, showMedian, factor, factor])

  return (
    <svg ref={svgRef} className='quiver' style={{width: `${width}`, height: `${height}`}}></svg>
  )
}
