import { useEffect, useRef } from 'react';
import './components.css';
import { useDataSlice } from '../hooks';
import { QuiverData } from '../helpers/drawVectorsFunctions';
import { drawQuiver } from './Graphs/drawQuiver';

interface QuiverProps {
  width: number;
  height: number;
  factor: number;
  data: QuiverData[]
}

export const Quiver = ({ width, height, factor, data }: QuiverProps) => {
  const svgRef = useRef(null);
  const { images, quiver } = useDataSlice();

  useEffect(() => {
    if (quiver === null ) return;
    drawQuiver(svgRef, data, width, height, factor);
    }, [quiver, images.active, factor]);

  return <svg ref={svgRef} className="quiver" style={{ width: `${width}`, height: `${height}` }}></svg>;
};