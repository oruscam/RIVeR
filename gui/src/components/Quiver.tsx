import { useEffect } from 'react';
import * as d3 from 'd3';
import './components.css';
import { useDataSlice, useProjectSlice } from '../hooks';
import { QuiverData } from '../../commons/types';
import { drawQuiver } from './Graphs/drawQuiver';
import { OverlayLayers } from './OverlaySvg';

interface QuiverProps {
  width: number;
  height: number;
  factor: number;
  data: QuiverData[];
  showMedian?: boolean;
  layers: OverlayLayers;
}

export const Quiver = ({ factor, data, showMedian, layers }: QuiverProps) => {
  const { images, quiver } = useDataSlice();
  const { projectDetails } = useProjectSlice();

  const { quiverLayerRef } = layers;

  useEffect(() => {
    if (!quiverLayerRef.current) return;
    const quiverLayerSel = d3.select(quiverLayerRef.current);

    quiverLayerSel.selectAll('*').remove();
    if (quiver === null) return;

    drawQuiver(quiverLayerSel as any, data, factor, projectDetails.unitSistem);
  }, [quiver, images.active, factor, showMedian, quiverLayerRef, data, projectDetails.unitSistem]);

  return null;
};
