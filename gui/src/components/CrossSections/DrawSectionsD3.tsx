import { useCallback, useEffect, useState } from "react";
import * as d3 from "d3";
import { useSectionSlice, useUiSlice } from "../../hooks";
import { drawInteractiveSection, drawStaticSection, getResizedPoint } from "./drawSections";
import type { OverlayLayers } from "../OverlaySvg";

type Point = { x: number; y: number };

export const DrawSectionsD3 = ({
  width,
  height,
  factor,
  module,
  scale,
  position,
  layers,
  sectionIndex,
}: {
  width: number;
  height: number;
  factor: number | { x: number; y: number };
  module: string;
  scale: number;
  position: { x: number; y: number };
  layers: OverlayLayers;
  sectionIndex?: number;
}) => {
  const { sections, activeSection, onSetDirPoints } = useSectionSlice();
  const { seeAll } = useUiSlice();

  const { svgRef, overlayZoomRef, staticLayerRef, interactiveLayerRef, uiLayerRef } = layers;

  const { dirPoints, sectionPoints, name } = sections[activeSection];

  const [startPoint, setStartPoint] = useState<Point | null>(
    dirPoints.length > 0 ? getResizedPoint(dirPoints[0], factor) : null
  );
  const [endPoint, setEndPoint] = useState<Point | null>(
    dirPoints.length > 0 ? getResizedPoint(dirPoints[1], factor) : null
  );
  const [mousePressed, setMousePressed] = useState<boolean>(false);

  const getPointerInZoom = useCallback((nativeEvt: Event) => {
    const container = overlayZoomRef.current ?? svgRef.current;
    return d3.pointer(nativeEvt as any, container as any);
  }, [overlayZoomRef, svgRef]);

  // Static drawing
  useEffect(() => {
    if (!staticLayerRef.current || !uiLayerRef.current) return;
    const staticLayerSel = d3.select(staticLayerRef.current);
    const uiLayerSel = d3.select(uiLayerRef.current);

    staticLayerSel.selectAll("*").remove();
    uiLayerSel.selectAll("*").remove();

    sections.forEach((section, index) => {
      if (module === 'x-sections' && index === activeSection) return 
      if (module === 'report' && sectionIndex !== undefined && index !== sectionIndex) return

      const { dirPoints, sectionPoints, name } = section;

      drawStaticSection({
        zoomLayer: staticLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
        uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
        factor,
        dirPoints,
        sectionPoints,
        name,
        imageWidth: width,
        imageHeight: height,
        module,
        scale,
        position,
        seeAll,
        isActive: index === activeSection
      });
    });
  }, [sections, activeSection, factor, seeAll, scale, position, width, height, staticLayerRef, uiLayerRef]);

  // Interactive drawing
  useEffect(() => {
    if (!interactiveLayerRef.current || !uiLayerRef.current || !overlayZoomRef.current) return;
    if (module !== 'x-sections') return;

    const layerSel = d3.select(interactiveLayerRef.current);
    const uiLayerSel = d3.select(uiLayerRef.current);
    const zoomLayerNode = overlayZoomRef.current!;

    layerSel.selectAll("*").remove();

    drawInteractiveSection({
      layer: layerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      uiLayer: uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      zoomLayerNode,
      startPoint,
      endPoint,
      sectionPoints,
      name,
      setMousePressed,
      setStartPoint,
      setEndPoint,
      onSetDirPoints,
      factor,
      mousePressed,
      viewport: {
        imageWidth: width,
        imageHeight: height,
        position,
        scale
      },
      module: 'x-sections'
    })

    return () => {
      layerSel.on(".drag", null);
    };
  }, [
    startPoint,
    endPoint,
    factor,
    sectionPoints,
    name,
    mousePressed,
    module,
    scale,
    position,
    width,
    height,
    interactiveLayerRef,
    uiLayerRef,
    overlayZoomRef,
    seeAll
  ]);

  // Sync with store
  useEffect(() => {
    const { dirPoints } = sections[activeSection];
    setStartPoint(dirPoints.length > 0 ? getResizedPoint(dirPoints[0], factor) : null);
    setEndPoint(dirPoints.length > 0 ? getResizedPoint(dirPoints[1], factor) : null);
  }, [sections, activeSection, factor]);

  // Attach root SVG listeners for section creation (namespaced)
  useEffect(() => {
    if (!svgRef.current) return;
    const svgSel = d3.select(svgRef.current);

    const onMouseDown = (event: any) => {
      if (module !== 'x-sections') return;
      if (dirPoints.length === 0) {
        setMousePressed(true);
        const [x, y] = getPointerInZoom(event);
        setStartPoint({ x, y });
        setEndPoint({ x, y });
      }
    };

    const onMouseMove = (event: any) => {
      if (module !== 'x-sections') return;
      if (mousePressed && dirPoints.length === 0) {
        const [x, y] = getPointerInZoom(event);
        setEndPoint({ x, y });
      }
    };

    const onMouseUp = () => {
      if (module !== 'x-sections') return;
      if (mousePressed && startPoint && endPoint && dirPoints.length === 0) {
        setMousePressed(false);
        onSetDirPoints(
          { points: [startPoint, endPoint], factor: factor as number, index: null },
          null
        );
      } else {
        setMousePressed(false);
      }
    };

    svgSel.on("mousedown.sections", onMouseDown);
    svgSel.on("mousemove.sections", onMouseMove);
    svgSel.on("mouseup.sections", onMouseUp);

    return () => {
      svgSel.on(".sections", null);
    };
  }, [
    svgRef,
    module,
    dirPoints.length,
    mousePressed,
    startPoint,
    endPoint,
    onSetDirPoints,
    factor,
    getPointerInZoom,
  ]);

  return null;
};