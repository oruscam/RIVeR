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
}

export const Quiver = ({ width, height, factor, activeStep }: QuiverProps) => {
  const svgRef = useRef(null)
  const { images, quiver, processing } = useDataSlice();

  console.log(quiver)
  console.log(processing.test)

  if(quiver){
    const { x, y, u, v, typevector } = quiver;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Limpiar el SVG antes de dibujar

    svg.attr("width", width)
       .attr("height", height)
       .style("background-color", "transparent");

    const flatXTable = x.map((d, i) => typevector[i] === 1 ? d : -10000); 
    const flatYTable = y.map((d, _i) => {return d});
    const uTable = u[activeStep === PROCESSING_STEP_NUMBER ? 0 : images.active]; // [counter]
    const vTable = v[activeStep === PROCESSING_STEP_NUMBER ? 0 : images.active]; // [counter]


    svg.selectAll('line')
      .data(flatXTable)
      .enter()
      .append('line')
        .attr('x1', (_d: string, i: number) => flatXTable[i] / factor.x)
        .attr('y1', (_d: string, i: number) => flatYTable[i] / factor.y)
        .attr('x2', (_d: string, i: number) => flatXTable[i] / factor.x + uTable[i] * 20)
        .attr('y2', (_d: string, i: number) => flatYTable[i] / factor.y + vTable[i] * 20)
        .attr('stroke', 'black')
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
        .attr("fill", "black");
  }

  return (
    <svg ref={svgRef} className='quiver' style={{width: `${width}`, height: `${height}`}}></svg>
  )
}
