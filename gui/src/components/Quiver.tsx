import { useRef } from 'react'
import * as d3 from 'd3'
import './components.css'
import { useDataSlice } from '../hooks'
import { PROCESSING_STEP_NUMBER } from '../constants/constants'

interface QuiverProps {
  width: number;
  height: number;
  factor: {x: number, y: number};
  activeStep: number;
  showMedian?: boolean;
}

export const Quiver = ({ width, height, factor, activeStep, showMedian }: QuiverProps) => {
  const svgRef = useRef(null)
  const { images, quiver } = useDataSlice();

  console.log(images.active)

  if(quiver){
    const { x, y, u, v, typevector, u_median, v_median } = quiver;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Limpiar el SVG antes de dibujar

    svg.attr("width", width)
       .attr("height", height)
       .style("background-color", "transparent");

    const flatXTable = x.map((d, i) => typevector[i] === 1 ? d : -10000); 
    const flatYTable = y.map((d, _i) => {return d});
    
    let uTable: number[] = [];
    let vTable: number[] = [];

    if( showMedian ){
      uTable = u_median || [];
      vTable = v_median || [];
    }else {
      uTable = u[activeStep === PROCESSING_STEP_NUMBER ? 0 : images.active]; // [counter]
      vTable = v[activeStep === PROCESSING_STEP_NUMBER ? 0 : images.active]; // [counter]
    }


    svg.selectAll('line')
      .data(flatXTable)
      .enter()
      .append('line')
        .attr('x1', (_d: string, i: number) => flatXTable[i] / factor.x)
        .attr('y1', (_d: string, i: number) => flatYTable[i] / factor.y)
        .attr('x2', (_d: string, i: number) => flatXTable[i] / factor.x + uTable[i] * 20)
        .attr('y2', (_d: string, i: number) => flatYTable[i] / factor.y + vTable[i] * 20)
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
  }

  return (
    <svg ref={svgRef} className='quiver' style={{width: `${width}`, height: `${height}`}}></svg>
  )
}
