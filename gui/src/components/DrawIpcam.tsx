import * as d3 from 'd3';
import { useEffect, useState } from 'react';
import { useIpcamSlice } from '../hooks';
import { OverlayLayers } from './OverlaySvg';
import { drawIpcam, transformPointCoordinates } from './Graphs/drawIpcam';
import { IpcamPoint } from '../store/ipcam/types';

export const DrawIpcam = ({
  width,
  height,
  factor,
  scale,
  position,
  layers,
}: {
  width: number;
  height: number;
  factor: number;
  scale: number;
  position: { x: number; y: number };
  layers: OverlayLayers;
}) => {
  const { points, activePoint, onSetPointPixelCoordinates, onSetActivePoint, cameraSolution } = useIpcamSlice();
  const { interactiveLayerRef, uiLayerRef } = layers;

  const [localPoints, setLocalPoints] = useState<IpcamPoint[] | null>(transformPointCoordinates(points, factor));
  const [, setMousePressed] = useState(false);

  useEffect(() => {
    if (!interactiveLayerRef.current) return;
    const interactiveLayerSel = d3.select(interactiveLayerRef.current);
    const uiLayerSel = d3.select(uiLayerRef.current);

    interactiveLayerSel.selectAll('*').remove();

    drawIpcam({
      layer: interactiveLayerSel,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      localPoints,
      factor,
      scale,
      width,
      height,
      activePoint,
      setMousePressed,
      onSetPointInStore: onSetPointPixelCoordinates,
      onSetActivePoint,
      cameraSolution,
    });
    // onSetActivePoint/onSetPointPixelCoordinates are recreated every render; adding them would
    // clear and redraw the interactive layer on every parent re-render, interrupting an active drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    localPoints,
    activePoint,
    scale,
    position,
    factor,
    width,
    height,
    cameraSolution,
    interactiveLayerRef,
    uiLayerRef,
  ]);

  useEffect(() => {
    setLocalPoints(transformPointCoordinates(points, factor));
  }, [points, factor]);

  return null;
};
