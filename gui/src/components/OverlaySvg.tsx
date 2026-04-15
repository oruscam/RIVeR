import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as d3 from "d3";

export type OverlayLayers = {
  svgRef: React.RefObject<SVGSVGElement>;
  overlayZoomRef: React.RefObject<SVGGElement>;
  staticLayerRef: React.RefObject<SVGGElement>;
  quiverLayerRef: React.RefObject<SVGGElement>;
  interactiveLayerRef: React.RefObject<SVGGElement>;
  staticMaskLayerRef: React.RefObject<SVGGElement>;
  maskLayerRef: React.RefObject<SVGGElement>;
  uiLayerRef: React.RefObject<SVGGElement>;
};

type Props = {
  width: number;
  height: number;
  scale: number;
  position: { x: number; y: number };
  children: (layers: OverlayLayers) => React.ReactNode;
};

export const OverlaySvg: React.FC<Props> = ({ width, height, scale, position, children }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  const overlayZoomRef = useRef<SVGGElement | null>(null);
  const staticLayerRef = useRef<SVGGElement | null>(null);
  const quiverLayerRef = useRef<SVGGElement | null>(null);
  const interactiveLayerRef = useRef<SVGGElement | null>(null);
  const staticMaskLayerRef = useRef<SVGGElement | null>(null);
  const maskLayerRef = useRef<SVGGElement | null>(null);
  const uiLayerRef = useRef<SVGGElement | null>(null);

  const cx = useMemo(() => width / 2, [width]);
  const cy = useMemo(() => height / 2, [height]);

  const zoomTransform = useMemo(
    () =>
      `translate(${position.x}, ${position.y}) translate(${cx}, ${cy}) scale(${scale}) translate(${-cx}, ${-cy})`,
    [position.x, position.y, cx, cy, scale]
  );

  useLayoutEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    svg
      .attr("width", width)
      .attr("height", height)
      .style("position", "absolute")
      .style("top", 0)
      .style("left", 0)
      .style("background", "transparent");

    svg.selectAll("*").remove();

    const overlayZoom = svg.append("g").attr("class", "overlay-zoom");
    const interactiveLayer = overlayZoom.append("g").attr("class", "interactive-section-layer");
    // Static (non-active) mask polygons — below the active mask layer
    const staticMaskLayer = overlayZoom.append("g").attr("class", "static-mask-layer");
    const maskLayer = overlayZoom.append("g").attr("class", "mask-layer");
    const staticLayer = overlayZoom.append("g").attr("class", "static-section-layer");
    const quiverLayer = overlayZoom.append("g").attr("class", "quiver-layer"); // por encima de static
    const uiLayer = svg.append("g").attr("class", "overlay-ui"); // SIEMPRE por encima de overlayZoom

    interactiveLayerRef.current = interactiveLayer.node();
    staticMaskLayerRef.current = staticMaskLayer.node();
    maskLayerRef.current = maskLayer.node();

    staticLayerRef.current = staticLayer.node();
    quiverLayerRef.current = quiverLayer.raise().node();

    overlayZoomRef.current = overlayZoom.node();
    uiLayerRef.current = uiLayer.node();
  }, [width, height]);

  useLayoutEffect(() => {
    if (!overlayZoomRef.current) return;
    d3.select(overlayZoomRef.current).attr("transform", zoomTransform);
  }, [zoomTransform]);

  const layers: OverlayLayers = {
    svgRef,
    overlayZoomRef,
    staticLayerRef,
    quiverLayerRef,
    interactiveLayerRef,
    staticMaskLayerRef,
    maskLayerRef,
    uiLayerRef,
  };

  return <svg ref={svgRef}>{children(layers)}</svg>;
};