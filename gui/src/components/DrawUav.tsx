import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { getResizedPoint } from "./CrossSections/drawSections";
import { Point } from "../types";
import { useUavSlice } from "../hooks";

export const DrawUav = ({
    width,
    height,
    factor,
    scale,
    position,
}: {
    width: number;
    height: number;
    factor: number;
    scale: number;
    position: { x: number; y: number };
}) => {
        const svgRef = useRef<SVGSVGElement>(null);
        
        // Persistent layer refs
        const zoomLayerRef = useRef<SVGGElement | null>(null);
        const staticLayerRef = useRef<SVGGElement | null>(null);
        const interactiveLayerRef = useRef<SVGGElement | null>(null);
        const uiLayerRef = useRef<SVGGElement | null>(null);

        const { dirPoints, onSetPixelDirection } = useUavSlice();

        // Local interactive state (in overlay-zoom coordinate system)
        const [startPoint, setStartPoint] = useState<Point | null>(
            dirPoints.length > 0 ? getResizedPoint(dirPoints[0], factor) : null
        );
        const [endPoint, setEndPoint] = useState<Point | null>(
            dirPoints.length > 0 ? getResizedPoint(dirPoints[1], factor) : null
        );
        const [mousePressed, setMousePressed] = useState<boolean>(false);

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
              .style("background-color", "transparent")
              .style("position", "absolute")
              .style("top", 0)
              .style("left", 0);
        
            // Reset and create persistent graph structure
            svg.selectAll("*").remove();
        
            const zoomLayer = svg.append("g").attr("class", "overlay-zoom");
            const staticLayer = zoomLayer.append("g").attr("class", "static-section-layer");
            const interactiveLayer = zoomLayer.append("g").attr("class", "interactive-section-layer");
            const uiLayer = svg.append("g").attr("class", "overlay-ui");
        
            zoomLayerRef.current = zoomLayer.node();
            staticLayerRef.current = staticLayer.node();
            interactiveLayerRef.current = interactiveLayer.node();
            uiLayerRef.current = uiLayer.node();
        }, [width, height]);

        /**
        * Update zoom transform without recreating layers.
        */
        useEffect(() => {
            const zoomLayerNode = zoomLayerRef.current;
            if (!zoomLayerNode) return;
            d3.select(zoomLayerNode).attr("transform", zoomTransform);
        }, [zoomTransform]);

        /**
         * Get pointer in overlay-zoom coordinates. If zoom layer is not present yet,
         * fall back to SVG root (less accurate, but prevents crashes).
         */
        const getPointerInZoom = useCallback((nativeEvt: Event) => {
            const container = zoomLayerRef.current ?? svgRef.current;
            return d3.pointer(nativeEvt as any, container as any);
        }, []);

        
        
    return (
        <svg ref={svgRef} className="svg-in-image-container"/>
    )
}