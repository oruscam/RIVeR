import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import './components.css';
import { useDataSlice } from '../hooks';
import { QuiverData } from '../helpers/drawVectorsFunctions';
import { drawQuiver } from './Graphs/drawQuiver';
import { OverlayLayers } from './OverlaySvg';

interface QuiverProps {
  width: number;
  height: number;
  factor: number;
  data: QuiverData[];
  showMedian?: boolean;
  layers: OverlayLayers
}

export const Quiver = ({ width, height, factor, data, showMedian, layers }: QuiverProps) => {
  const svgRef = useRef(null);
  const { images, quiver } = useDataSlice();

  const { staticLayerRef } = layers;


  useEffect(() => {
    if (!staticLayerRef.current) return;
    const staticLayerSel = d3.select(staticLayerRef.current);

    staticLayerSel.selectAll('*').remove(); 
    if (quiver === null ) return;
    
    drawQuiver(staticLayerSel, data, factor);
    }, [quiver, images.active, factor, showMedian]);

  return <svg ref={svgRef} className="quiver" style={{ width: `${width}`, height: `${height}` }}/>;
};  