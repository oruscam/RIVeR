import { useEffect, useRef, useState } from "react";
import { useSectionSlice, useUiSlice } from "../../hooks";
import { drawInteractiveSection, drawStaticSection, getResizedPoint } from "./drawSections";
import { MODULE_NUMBER } from "../../constants/constants";
import * as d3 from "d3";

export const DrawSectionsD3 = ({
  width,
  height,
  factor,
  step,
  scale,
  position,
}: {
  width: number;
  height: number;
  factor: number;
  step: number;
  scale: number;
  position: { x: number; y: number };
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomLayerRef = useRef<SVGGElement | null>(null);

  const { sections, activeSection, onSetDirPoints } = useSectionSlice();
  const { seeAll } = useUiSlice();

  const { dirPoints, sectionPoints } = sections[activeSection];

  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    dirPoints.length > 0 ? getResizedPoint(dirPoints[0], factor) : null
  );
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(
    dirPoints.length > 0 ? getResizedPoint(dirPoints[1], factor) : null
  );
  const [mousePressed, setMousePressed] = useState<boolean>(false);

  // Dibujo estático (overlay-zoom + static sections)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg
      .attr("width", width)
      .attr("height", height)
      .style("background-color", "transparent")
      .style("position", "absolute")
      .style("top", 0)
      .style("left", 0);

    const cx = width / 2;
    const cy = height / 2;

    const zoomLayer = svg
      .append("g")
      .attr("class", "overlay-zoom")
      .attr(
        "transform",
        `translate(${position.x}, ${position.y}) translate(${cx}, ${cy}) scale(${scale}) translate(${-cx}, ${-cy})`
      );

    // Guarda referencia al nodo transformado (sistema de coords de "imagen")
    zoomLayerRef.current = zoomLayer.node();

    const uiLayer = svg.append("g").attr("class", "overlay-ui");

    sections.forEach((section, index) => {
      if (step === MODULE_NUMBER.CROSS_SECTIONS && (index === activeSection || seeAll === false)) {
        return;
      }
      const { dirPoints, sectionPoints, name } = section;

      drawStaticSection({
        zoomLayer,
        uiLayer,
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
  }, [width, height, factor, activeSection, seeAll, scale, position, sections, step]);

  // Interacción: puntos y líneas (dentro de overlay-zoom)
  useEffect(() => {
    if (!svgRef.current) return;
    if (step !== MODULE_NUMBER.CROSS_SECTIONS) return;

    // Si el estático todavía no creó overlay-zoom, salir
    const zoomLayerNode = zoomLayerRef.current;
    if (!zoomLayerNode) return;

    const svg = d3.select(svgRef.current);
    const zoomLayerSel = d3.select(zoomLayerNode);

    // Limpiar capa interactiva dentro del zoom
    zoomLayerSel.selectAll(".interactive-section-layer").remove();
    const layer = zoomLayerSel.append("g").attr("class", "interactive-section-layer");

    drawInteractiveSection(
      layer,
      zoomLayerNode,
      startPoint,
      endPoint,
      dirPoints,
      sectionPoints,
      setMousePressed,
      setStartPoint,
      setEndPoint,
      onSetDirPoints,
      factor,
      activeSection,
      mousePressed
    )
  }, [
    startPoint,
    endPoint,
    factor,
    activeSection,
    dirPoints.length,
    mousePressed,
    step,
    // Importante: repintar capa interactiva cuando cambia el zoom/pan
    scale,
    position,
    sectionPoints
  ]);

  // Mantener estado en sync con store
  useEffect(() => {
    const { dirPoints } = sections[activeSection];
    setStartPoint(dirPoints.length > 0 ? getResizedPoint(dirPoints[0], factor) : null);
    setEndPoint(dirPoints.length > 0 ? getResizedPoint(dirPoints[1], factor) : null);
  }, [sections, activeSection, factor]);

  // Helpers para obtener puntero en el espacio de overlay-zoom
  const getPointerInZoom = (nativeEvt: Event) => {
    // Si por algún motivo aún no hay zoomLayer, usa SVG como fallback
    const container = zoomLayerRef.current ?? svgRef.current;
    return d3.pointer(nativeEvt as any, container as any);
  };

  // Crear puntos (coords en espacio del zoom)
  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (step !== MODULE_NUMBER.CROSS_SECTIONS) return;
    if (dirPoints.length === 0) {
      setMousePressed(true);
      const [x, y] = getPointerInZoom(event.nativeEvent);
      setStartPoint({ x, y });
      setEndPoint({ x, y });
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (step !== MODULE_NUMBER.CROSS_SECTIONS) return;
    if (mousePressed && dirPoints.length === 0) {
      const [x, y] = getPointerInZoom(event.nativeEvent);
      setEndPoint({ x, y });
    }
  };

  const handleMouseUp = () => {
    if (step !== MODULE_NUMBER.CROSS_SECTIONS) return;
    if (mousePressed && startPoint && endPoint && dirPoints.length === 0) {
      setMousePressed(false);
      onSetDirPoints(
        {
          points: [startPoint, endPoint],
          factor,
          index: activeSection,
        },
        null
      );
    } else {
      setMousePressed(false);
    }
  };

  // console.log('section points 0', {
  //   x: sectionPoints[0].x,
  //   y: sectionPoints[0].y,
  // })

  //   console.log('section points 1', {
  //   x: sectionPoints[1].x,  
  //   y: sectionPoints[1].y,
  // })

  return (
    <svg
      ref={svgRef}
      className="svg-in-image-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};