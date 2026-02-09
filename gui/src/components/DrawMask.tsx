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

  // Calcular puntos iniciales una sola vez para poder usarlo en nextIdRef
  const initialPoints =
    masks.length === 0 || activeMaskIndex == null
      ? []
      : masks[activeMaskIndex].map((p, i) => ({ x: p.x, y: p.y, id: i }));

  const [points, setPoints] = useState(initialPoints);

  // Inicializar el próximo id basado en los puntos iniciales
  const nextIdRef = useRef(initialPoints.length);

  // IMPORTANTE: ahora 'dragging' guarda el id del punto (no el índice)
  const [draggingId, setDraggingId] = useState<number | string | null>(null);
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

    if (masks.length === 0 || activeMaskIndex === null) {
      layerSel.selectAll("*").remove();
      return;
    }

    drawMask(
      layerSel as any,
      svgRef,
      addPoint,
      setDragStartZoom,
      setDraggingId, // pasa el setter que guarda id
      setDraggingAll,
      points,
      transformToViewport,
      transformToImage,
      scale
    );
  }, [points, maskLayerRef, overlayZoomRef, svgRef, scale]);

  useEffect(() => {
    // Cuando cambian la máscara activa o sus puntos, resetea estado local e ids
    const newPoints =
      masks.length === 0 || activeMaskIndex == null
        ? []
        : masks[activeMaskIndex].map((p, i) => ({ x: p.x, y: p.y, id: i }));
    setPoints(newPoints);
    // Actualiza el contador de ids para nuevos puntos
    nextIdRef.current = newPoints.length;
  }, [activeMaskIndex, masks]);

  const addPoint = (index: number, xImg: number, yImg: number) => {
    const newPoints = [...points];
    newPoints.splice(index, 0, { x: xImg, y: yImg, id: nextIdRef.current++ });
    setPoints(newPoints);
  };

  useEffect(() => {
    if (!svgRef.current || !overlayZoomRef.current) return;
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
      } else if (draggingId !== null) {
        event.stopPropagation();
        const [x, y] = d3.pointer(event, zoomNode);
        const img = transformToImage(x, y);
        setPoints((pts) => {
          const next = [...pts];
          const idx = next.findIndex((p) => p.id === draggingId);
          if (idx >= 0) next[idx] = { ...next[idx], x: img.x, y: img.y };
          return next;
        });
      }
    };

    const onMouseUp = () => {
      if (draggingId !== null || draggingAll) {
        // Persistir puntos actuales
        onUpdateMaskPoints(
          activeMaskIndex!,
          points.map((p) => ({ x: p.x, y: p.y }))
        );
      }
      setDraggingId(null);
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
    draggingId,
    draggingAll,
    dragStartZoom,
    points,
    factor,
    activeMaskIndex,
    onUpdateMaskPoints
  ]);

  return null;
};