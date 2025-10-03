import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './components.css';
import { useDataSlice } from '../hooks';
import { QuiverData } from '../helpers/drawVectorsFunctions';
import { drawQuiver } from './Graphs/drawQuiver';

interface QuiverProps {
  width: number;
  height: number;
  factor: number;
  data: QuiverData[];
  showMedian?: boolean;
}

export const Quiver = ({ width, height, factor, data, showMedian }: QuiverProps) => {
  const svgRef = useRef(null);
  const { images, quiver } = useDataSlice();

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    svg.selectAll('*').remove(); 
    svg.attr('width', width).attr('height', height).style('background-color', 'transparent');

    if (quiver === null ) return;
    
    drawQuiver(svg, data, factor);
    }, [quiver, images.active, factor, showMedian]);

  return <svg ref={svgRef} className="quiver" style={{ width: `${width}`, height: `${height}` }}></svg>;
};  