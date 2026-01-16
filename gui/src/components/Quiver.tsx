import { useEffect } from 'react';
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

export const Quiver = ({ factor, data, showMedian, layers }: QuiverProps) => {
  const { images, quiver } = useDataSlice();

  const { quiverLayerRef } = layers;

  useEffect(() => {
    if (!quiverLayerRef.current) return;
    const quiverLayerSel = d3.select(quiverLayerRef.current);

    quiverLayerSel.selectAll('*').remove(); 
    if (quiver === null ) return;
    
    drawQuiver(quiverLayerSel as any, data, factor);
  }, [quiver, images.active, factor, showMedian, quiverLayerRef]);

  return null;
};