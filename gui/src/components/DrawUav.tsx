import { useCallback, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { drawInteractiveSection, getResizedPoint } from './CrossSections/drawSections';
import { Point } from '../types';
import { useUavSlice } from '../hooks';
import { OverlayLayers } from './OverlaySvg';

export const DrawUav = ({
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
  const { overlayZoomRef, interactiveLayerRef, uiLayerRef, svgRef } = layers;

  const { dirPoints, onSetPixelDirection } = useUavSlice();

  // Local interactive state (in overlay-zoom coordinate system)
  const [startPoint, setStartPoint] = useState<Point | null>(
    dirPoints.length > 0 ? getResizedPoint(dirPoints[0], factor) : null
  );
  const [endPoint, setEndPoint] = useState<Point | null>(
    dirPoints.length > 0 ? getResizedPoint(dirPoints[1], factor) : null
  );
  const [mousePressed, setMousePressed] = useState<boolean>(false);

  const getPointerInZoom = useCallback(
    (nativeEvt: Event) => {
      const container = overlayZoomRef.current ?? svgRef.current;
      return d3.pointer(nativeEvt as any, container as any);
    },
    [overlayZoomRef, svgRef]
  );

  useEffect(() => {
    const layerSel = d3.select(interactiveLayerRef.current);
    const uiLayerSel = d3.select(uiLayerRef.current);
    const zoomLayerNode = overlayZoomRef.current!;

    drawInteractiveSection({
      layer: layerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      zoomLayerNode,
      startPoint,
      endPoint,
      setMousePressed,
      setStartPoint,
      setEndPoint,
      onSetDirPoints: onSetPixelDirection,
      factor,
      mousePressed,
      viewport: {
        imageWidth: width,
        imageHeight: height,
        position,
        scale,
      },
      module: 'uav',
    });

    return () => {
      layerSel.on('.drag', null);
    };
  }, [startPoint, endPoint, factor, scale, position]);

  // Attach root SVG listeners for section creation (namespaced)
  useEffect(() => {
    if (!svgRef.current) return;
    const svgSel = d3.select(svgRef.current);

    const onMouseDown = (event: any) => {
      if (dirPoints.length === 0) {
        setMousePressed(true);
        const [x, y] = getPointerInZoom(event);
        setStartPoint({ x, y });
        setEndPoint({ x, y });
      }
    };

    const onMouseMove = (event: any) => {
      if (mousePressed && dirPoints.length === 0) {
        const [x, y] = getPointerInZoom(event);
        setEndPoint({ x, y });
      }
    };

    const onMouseUp = () => {
      if (mousePressed && startPoint && endPoint && dirPoints.length === 0) {
        setMousePressed(false);
        onSetPixelDirection({ points: [startPoint, endPoint], factor: factor as number, index: null }, null);
      } else {
        setMousePressed(false);
      }
    };

    svgSel.on('mousedown.sections', onMouseDown);
    svgSel.on('mousemove.sections', onMouseMove);
    svgSel.on('mouseup.sections', onMouseUp);

    return () => {
      svgSel.on('.sections', null);
    };
  }, [
    svgRef,
    dirPoints.length,
    mousePressed,
    startPoint,
    endPoint,
    onSetPixelDirection,
    factor,
    getPointerInZoom,
  ]);

  useEffect(() => {
    if (dirPoints.length !== 0) {
      setStartPoint(getResizedPoint(dirPoints[0], factor));
      setEndPoint(getResizedPoint(dirPoints[1], factor));
    } else {
      setStartPoint(null);
      setEndPoint(null);
    }
  }, [dirPoints, factor]);

  return null;
};
