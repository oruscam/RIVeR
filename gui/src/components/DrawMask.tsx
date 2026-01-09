import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useDataSlice } from "../hooks";
import { drawMask } from "./Graphs/drawMask";
import type { OverlayLayers } from "./OverlaySvg";

export const DrawMask = ({
  factor,
  layers,
  scale
}: {
  factor: number;
  layers: OverlayLayers;
  scale: number;
}) => {
  const { processing, onUpdateMaskPoints } = useDataSlice();
  const { masks, activeMaskIndex } = processing;

  const { svgRef, overlayZoomRef, maskLayerRef } = layers;

  const [points, setPoints] = useState(
    masks![activeMaskIndex!].map((p, i) => ({ x: p.x, y: p.y, id: i }))
  );

  const nextIdRef = useRef(3);
  const [dragging, setDragging] = useState<number | null>(null);
  const [draggingAll, setDraggingAll] = useState(false);
  const [dragStartZoom, setDragStartZoom] = useState<{ x: number; y: number } | null>(null);

  const transformToViewport = (x: number, y: number) => {
    return { x: x / factor, y: y / factor };
  };
  const transformToImage = (vx: number, vy: number) => {
    return { x: vx * factor, y: vy * factor };
  };

  useEffect(() => {
    if (!maskLayerRef.current || !overlayZoomRef.current || !svgRef.current) return;
    const layerSel = d3.select(maskLayerRef.current);

    drawMask(
      layerSel as any,
      svgRef,
      addPoint,
      setDragStartZoom,
      setDragging,
      setDraggingAll,
      points,
      transformToViewport,
      transformToImage,
      scale // <- pasar zoomFactor para tamaños constantes
    );
  }, [
    points,
    maskLayerRef,
    overlayZoomRef,
    svgRef,
    scale,
  ]);

  useEffect(() => {
    setPoints(masks![activeMaskIndex!].map((p, i) => ({ x: p.x, y: p.y, id: i })));
  }, [activeMaskIndex, masks]);

  const addPoint = (index: number, xImg: number, yImg: number) => {
    const newPoints = [...points];
    newPoints.splice(index, 0, { x: xImg, y: yImg, id: nextIdRef.current++ });
    setPoints(newPoints);
  };

  useEffect(() => {
    if (!svgRef.current || !overlayZoomRef.current) return;
    // if (scale !== 1){
    //   setDraggingAll(false)
    //   return;
    // };
    const svgSel = d3.select(svgRef.current);
    const zoomNode = overlayZoomRef.current;

    const onMouseMove = (event: any) => {
      if (draggingAll && dragStartZoom) {
        event.stopPropagation();
        const [x, y] = d3.pointer(event, zoomNode);
        const dx = x - dragStartZoom.x;
        const dy = y - dragStartZoom.y;

        const deltaImgX = dx * factor;
        const deltaImgY = dy * factor;

        setPoints((pts) => pts.map((p) => ({ ...p, x: p.x + deltaImgX, y: p.y + deltaImgY })));
        setDragStartZoom({ x, y });
      } else if (dragging !== null) {
        event.stopPropagation();
        const [x, y] = d3.pointer(event, zoomNode);
        const img = transformToImage(x, y);
        setPoints((pts) => {
          const next = [...pts];
          const idx = next.findIndex((p) => p.id === dragging);
          if (idx >= 0) next[idx] = { ...next[idx], x: img.x, y: img.y };
          return next;
        });
      }
    };

    const onMouseUp = () => {
      if (dragging !== null || draggingAll) {
        onUpdateMaskPoints(
          activeMaskIndex!,
          points.map((p) => ({ x: p.x, y: p.y }))
        );
      }
      setDragging(null);
      setDraggingAll(false);
      setDragStartZoom(null);
    };

    svgSel.on("mousemove.mask", onMouseMove);
    svgSel.on("mouseup.mask", onMouseUp);
    svgSel.on("mouseleave.mask", onMouseUp);

    return () => {
      svgSel.on(".mask", null);
    };
  }, [
    svgRef,
    overlayZoomRef,
    dragging,
    draggingAll,
    dragStartZoom,
    points,
    factor,
    activeMaskIndex,
    onUpdateMaskPoints,
  ]);

  return null;
};