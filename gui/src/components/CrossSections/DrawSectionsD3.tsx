import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { useSectionSlice, useUiSlice } from "../../hooks";
import { drawInteractiveSection, drawStaticSection, getResizedPoint } from "./drawSections";
import { MODULE_NUMBER } from "../../constants/constants";
import type { OverlayLayers } from "../OverlaySvg";

type Point = { x: number; y: number };

export const DrawSectionsD3 = ({
  width,
  height,
  factor,
  step,
  scale,
  position,
  layers,
}: {
  width: number;
  height: number;
  factor: number;
  step: number;
  scale: number;
  position: { x: number; y: number };
  layers: OverlayLayers;
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

  const cx = useMemo(() => width / 2, [width]);
  const cy = useMemo(() => height / 2, [height]);

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
    uiLayerSel.selectAll(".section-static-label").remove();

    sections.forEach((section, index) => {
      if (step === MODULE_NUMBER.CROSS_SECTIONS) {
        if (!seeAll) return;
        if (index === activeSection) return;
      }
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
        module: step === MODULE_NUMBER.PROCESSING ? "processing" : "x-sections",
        scale,
        position,
      });
    });
  }, [sections, activeSection, factor, seeAll, scale, position, step, width, height, staticLayerRef, uiLayerRef]);

  // Interactive drawing
  useEffect(() => {
    if (!interactiveLayerRef.current || !uiLayerRef.current || !overlayZoomRef.current) return;
    if (step !== MODULE_NUMBER.CROSS_SECTIONS) return;

    const layerSel = d3.select(interactiveLayerRef.current);
    const uiLayerSel = d3.select(uiLayerRef.current);
    const zoomLayerNode = overlayZoomRef.current!;

    layerSel.selectAll("*").remove();

    drawInteractiveSection(
      layerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
      uiLayerSel as unknown as d3.Selection<SVGGElement, unknown, null, undefined>,
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
      { imageWidth: width, imageHeight: height, position, scale }
    );

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
    step,
    scale,
    position,
    width,
    height,
    interactiveLayerRef,
    uiLayerRef,
    overlayZoomRef,
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
      if (step !== MODULE_NUMBER.CROSS_SECTIONS) return;
      if (dirPoints.length === 0) {
        setMousePressed(true);
        const [x, y] = getPointerInZoom(event);
        setStartPoint({ x, y });
        setEndPoint({ x, y });
      }
    };

    const onMouseMove = (event: any) => {
      if (step !== MODULE_NUMBER.CROSS_SECTIONS) return;
      if (mousePressed && dirPoints.length === 0) {
        const [x, y] = getPointerInZoom(event);
        setEndPoint({ x, y });
      }
    };

    const onMouseUp = () => {
      if (step !== MODULE_NUMBER.CROSS_SECTIONS) return;
      if (mousePressed && startPoint && endPoint && dirPoints.length === 0) {
        setMousePressed(false);
        onSetDirPoints(
          { points: [startPoint, endPoint], factor, index: null },
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
    step,
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