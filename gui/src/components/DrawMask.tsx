import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useTranslation } from 'react-i18next';
import { useDataSlice } from "../hooks";
import { drawMask, drawMaskLabel } from "./Graphs/drawMask";
import type { OverlayLayers } from "./OverlaySvg";

export const DrawMask = ({
  factor,
  layers,
  scale,
  imageWidth,
  imageHeight,
  onLivePoints,
}: {
  factor: number;
  layers: OverlayLayers;
  scale: number;
  /** Viewport-space size the mask labels' background box must stay fully inside. */
  imageWidth: number;
  imageHeight: number;
  /** Called with current image-space points on every live update (including during drag) */
  onLivePoints?: (points: { x: number; y: number }[]) => void;
}) => {
  const { processing, onUpdateMaskPoints } = useDataSlice();
  const { masks, activeMaskIndex, visibleMaskIndices } = processing;
  const { t } = useTranslation();

  const { svgRef, overlayZoomRef, maskLayerRef, staticMaskLayerRef } = layers;

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

  // Native image-space bounds (same space mask points are persisted in) — used
  // to keep dragged masks from leaving the image, mirroring how stabilization
  // regions are clamped to videoWidth/videoHeight in StabilizationCanvas.tsx.
  const nativeWidth = imageWidth * factor;
  const nativeHeight = imageHeight * factor;

  // Define #dashFill once on the SVG root so it survives mask mode changes.
  // drawMask() also checks for this pattern, but scoped to the mask-layer group;
  // defining it here ensures static masks can always reference it.
  // Must be a useEffect (not useLayoutEffect): OverlaySvg's own useLayoutEffect
  // does svg.selectAll("*").remove() on mount, and layout effects run child-before-
  // parent — so on first mount (e.g. masks already loaded from a saved project)
  // this would create the pattern only for OverlaySvg's wipe to immediately delete
  // it, with nothing left to trigger a re-run. useEffect always fires after every
  // useLayoutEffect in the tree, so it's guaranteed to run after the wipe.
  useEffect(() => {
    if (!svgRef.current) return;
    const svgSel = d3.select(svgRef.current);
    if (svgSel.select('#dashFill').empty()) {
      const defs = svgSel.select('defs').empty()
        ? svgSel.insert('defs', ':first-child')
        : svgSel.select('defs');
      const pattern = defs
        .append('pattern')
        .attr('id', 'dashFill')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 10)
        .attr('height', 10);
      pattern
        .append('path')
        .attr('d', 'M0 10 L10 0')
        .attr('stroke', '#ED6B57')
        .attr('stroke-width', 1);
    }
  }, [svgRef, masks]);

  useEffect(() => {
    if (!maskLayerRef.current || !overlayZoomRef.current || !svgRef.current) return;
    const layerSel = d3.select(maskLayerRef.current);

    if (masks.length === 0 || activeMaskIndex === null) {
      // Only remove mask drawing elements, not <defs> (pattern lives on svgRef)
      layerSel.selectAll('polygon, line, circle, rect, text, g.mask-label').remove();
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
      scale,
      `${t('CrossSections.mask', { defaultValue: 'Mask' })} ${activeMaskIndex + 1}`,
      { width: imageWidth, height: imageHeight }
    );
  }, [points, maskLayerRef, overlayZoomRef, svgRef, scale, activeMaskIndex, t, imageWidth, imageHeight]);

  // Toggle .mask-mode-active on the SVG root so the CSS rule with !important
  // can suppress pointer-events on the CS pin icons (which have pointer-events="all"
  // as SVG presentation attributes that D3's .style() on a parent group cannot override)
  useEffect(() => {
    if (!svgRef.current) return;
    svgRef.current.classList.toggle('mask-mode-active', activeMaskIndex !== null);
    return () => {
      svgRef.current?.classList.remove('mask-mode-active');
    };
  }, [activeMaskIndex, svgRef]);

  // Render all non-active masks as read-only polygons
  useEffect(() => {
    if (!staticMaskLayerRef.current) return;
    const layer = d3.select(staticMaskLayerRef.current);
    layer.selectAll('*').remove();

    const size = (px: number) => px / (scale || 1);

    masks.forEach((mask, i) => {
      // Skip: actively being edited (rendered interactively in maskLayerRef)
      if (i === activeMaskIndex) return;
      // Skip: eye is closed (user toggled this mask invisible)
      if (!visibleMaskIndices.includes(i)) return;
      const viewportPoints = mask.map((p) => ({ x: p.x / factor, y: p.y / factor }));
      const pts = viewportPoints.map((p) => `${p.x},${p.y}`).join(' ');
      layer
        .append('polygon')
        .attr('points', pts)
        .attr('fill', 'url(#dashFill)')  // pattern defined on svgRef root — always available
        .attr('stroke', '#ED6B57')
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.75)
        .style('pointer-events', 'none');

      if (viewportPoints.length > 0) {
        // Anchor to the mask's own topmost vertex rather than the bounding box's
        // horizontal center — for elongated/diagonal masks the bbox center can sit
        // far from the actual polygon, leaving the label floating away from it.
        const topPoint = viewportPoints.reduce((top, p) => (p.y < top.y ? p : top));
        drawMaskLabel(
          layer as any,
          `static-${i}`,
          `${t('CrossSections.mask', { defaultValue: 'Mask' })} ${i + 1}`,
          topPoint.x,
          topPoint.y - size(14),
          size,
          { width: imageWidth, height: imageHeight }
        );
      }
    });
  }, [masks, activeMaskIndex, visibleMaskIndices, factor, staticMaskLayerRef, scale, t, imageWidth, imageHeight]);

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

  // Stream live points to the parent on every change (including mid-drag)
  useEffect(() => {
    onLivePoints?.(points.map((p) => ({ x: p.x, y: p.y })));
  }, [points, onLivePoints]);

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

        let deltaImgX = dx * factor;
        let deltaImgY = dy * factor;

        // Clamp the whole-mask translation so its bounding box never leaves the
        // image, without deforming the shape (unlike clamping each point on its own).
        const minX = Math.min(...points.map((p) => p.x));
        const maxX = Math.max(...points.map((p) => p.x));
        const minY = Math.min(...points.map((p) => p.y));
        const maxY = Math.max(...points.map((p) => p.y));

        if (minX + deltaImgX < 0) deltaImgX = -minX;
        else if (maxX + deltaImgX > nativeWidth) deltaImgX = nativeWidth - maxX;
        if (minY + deltaImgY < 0) deltaImgY = -minY;
        else if (maxY + deltaImgY > nativeHeight) deltaImgY = nativeHeight - maxY;

        setPoints((pts) => pts.map((p) => ({ ...p, x: p.x + deltaImgX, y: p.y + deltaImgY })));
        setDragStartZoom({ x, y });
      } else if (draggingId !== null) {
        event.stopPropagation();
        const [x, y] = d3.pointer(event, zoomNode);
        const img = transformToImage(x, y);
        const clampedX = Math.min(Math.max(img.x, 0), nativeWidth);
        const clampedY = Math.min(Math.max(img.y, 0), nativeHeight);
        setPoints((pts) => {
          const next = [...pts];
          const idx = next.findIndex((p) => p.id === draggingId);
          if (idx >= 0) next[idx] = { ...next[idx], x: clampedX, y: clampedY };
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
    imageWidth,
    imageHeight,
    nativeWidth,
    nativeHeight,
    activeMaskIndex,
    onUpdateMaskPoints
  ]);

  return null;
};