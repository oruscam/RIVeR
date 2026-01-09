import * as d3 from "d3";
import { COLORS, MARKS } from "../../constants/constants";
import { getPositionSectionText } from "../../helpers";
import { pinGreen, pinRed } from "../../assets/icons/icons";

type Point = { x: number; y: number };

interface DrawSvgSectionLineProps {
  zoomLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  factor: number | { x: number; y: number };
  dirPoints: Point[];
  sectionPoints: Point[];
  name: string;
  imageWidth: number;
  imageHeight: number;
  module: "x-sections" | "processing" | "results" | "report" | string;
  scale: number;
  position: { x: number; y: number };
}

export const getResizedPoint = (point: Point, factor: number) => {
  return {
    x: point.x / factor,
    y: point.y / factor,
  };
};

/**
 * Normalize a factor that may be scalar or {x,y} into separate fx/fy.
 * Useful if the image is anisotropically scaled in X/Y.
 */
const normalizeFactor = (factor: number | { x: number; y: number }) => {
  return {
    fx: typeof factor === "number" ? factor : factor.x,
    fy: typeof factor === "number" ? factor : factor.y,
  };
};

/**
 * Map a logical module name to style choices for lines and labels.
 * resizeFactor affects non-scaling-stroke widths and font-size.
 */
const getSectionStyles = (module: string) => {
  let resizeFactor = 1;
  let lineColor = COLORS.BLACK;
  let textColor = COLORS.BLACK;

  switch (module) {
    case "x-sections":
      resizeFactor = 1;
      lineColor = COLORS.YELLOW;
      textColor = COLORS.YELLOW;
      break;
    case "processing":
      resizeFactor = 1;
      lineColor = COLORS.DARK_GREY;
      textColor = COLORS.BLACK;
      break;
    case "results":
      resizeFactor = 1;
      lineColor = COLORS.YELLOW;
      textColor = COLORS.YELLOW;
      break;
    case "report":
      resizeFactor = 1.2;
      lineColor = COLORS.YELLOW;
      textColor = COLORS.YELLOW;
      break;
    default:
      break;
  }

  return {
    resizeFactor,
    lineColor,
    textColor,
  };
};

/**
 * Append a line with standard attributes and optional dash.
 * Points are in "image space" unless fx/fy=1 (zoom space).
 */
const drawLine = ({
  points,
  group,
  color,
  resizeFactor,
  fx,
  fy,
  dashed = false,
  className,
}: {
  points: [Point, Point];
  group: d3.Selection<SVGGElement, unknown, null, undefined>;
  color: string;
  resizeFactor: number;
  fx: number;
  fy: number;
  dashed?: boolean;
  className: string;
}) => {
  group
    .append("line")
    .attr("class", className)
    .attr("x1", points[0].x / fx)
    .attr("y1", points[0].y / fy)
    .attr("x2", points[1].x / fx)
    .attr("y2", points[1].y / fy)
    .attr("stroke", color)
    .attr("stroke-width", 4 / resizeFactor)
    .attr("stroke-linecap", "round")
    .attr("vector-effect", "non-scaling-stroke")
    .attr("stroke-dasharray", dashed ? "5,10" : null);
};

/**
 * Draw a pin icon (L or R) plus its tiny label (L/R).
 * When draggable=true, pointer events are enabled for d3.drag.
 */
const drawIcon = (
  position: Point,
  type: "L" | "R",
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  draggable: boolean
) => {
  const isLeft = type === "L";
  const href = isLeft ? pinRed : pinGreen;
  const labelColor = isLeft ? COLORS.MARK_L : COLORS.MARK_R;

  const icon = layer
    .append("image")
    .attr("href", href) // moderno: usa 'href' (xlink deprecado)
    .attr("width", MARKS.WIDTH + 5)
    .attr("height", MARKS.HEIGHT + 5)
    .attr("x", position.x - MARKS.OFFSET_X - (isLeft ? 2 : 0))
    .attr("y", position.y - MARKS.OFFSET_Y - 2)
    .attr("cursor", draggable ? "move" : "default")
    .attr("pointer-events", draggable ? "all" : "none")
    .attr("class", `pin-${draggable ? "draggable" : "static"} pin-${type}`) // <-- clase para poder eliminar
    // .attr('z-index', 15)

  layer
    .append("text")
    .attr("class", `pin-label-${draggable ? "draggable" : "static"} pin-label-${type}`) // <-- clase para poder eliminar
    .attr("x", position.x - (isLeft ? 5 : 4))
    .attr("y", position.y - 20)
    .text(type)
    .attr("font-size", 19)
    .attr("font-weight", "600")
    .attr("fill", labelColor)
    .attr("pointer-events", "none");

  return icon;
};

/**
 * Convert from image space to screen space (UI layer).
 * p=(x,y) is normalized by (fx,fy) to overlay-zoom, then projected with viewport.
 */
const toScreenFactory = ({
  imageWidth,
  imageHeight,
  position,
  scale,
  fx,
  fy,
}: {
  imageWidth: number;
  imageHeight: number;
  position: { x: number; y: number };
  scale: number;
  fx: number;
  fy: number;
}) => {
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  return (p: Point) => {
    const px = p.x / fx;
    const py = p.y / fy;
    return {
      x: position.x + cx + (px - cx) * scale,
      y: position.y + cy + (py - cy) * scale,
    };
  };
};

/**
 * Minimal, shared label renderer that mimics the static behavior.
 * - Uses getPositionSectionText in IMAGE space for a nice placement & rotation.
 * - Projects to screen via current viewport, keeping font size constant.
 */
const drawSectionLabel = ({
  uiLayer,
  text,
  points,
  viewport,
  factor,
  resizeFactor,
  color,
  className,
  dy = 25,
}: {
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  text: string;
  points: [Point, Point]; // expected in image space
  viewport: {
    imageWidth: number;
    imageHeight: number;
    position: { x: number; y: number };
    scale: number;
  };
  factor: number | { x: number; y: number };
  resizeFactor: number;
  color: string;
  className: string;
  dy?: number;
}) => {
  const { fx, fy } = normalizeFactor(factor);

  // Compute a nicer label position and rotation using the same helper as static.
  const { point, rotation } = getPositionSectionText(
    points[0],
    points[1],
    viewport.imageWidth,
    viewport.imageHeight,
    typeof factor === "number" ? factor : fx
  );

  // Project to screen (UI layer keeps constant text size).
  const toScreen = toScreenFactory({
    imageWidth: viewport.imageWidth,
    imageHeight: viewport.imageHeight,
    position: viewport.position,
    scale: viewport.scale,
    fx,
    fy,
  });
  const screenPoint = toScreen(point);

  uiLayer
    .append("text")
    .attr("class", className)
    .attr("x", screenPoint.x)
    .attr("y", screenPoint.y)
    .attr("dy", dy)
    .text(text)
    .attr("font-size", 23 / resizeFactor)
    .attr("fill", color)
    .attr("font-weight", "500")
    .attr("transform", `rotate(${rotation}, ${screenPoint.x}, ${screenPoint.y})`)
    .attr("pointer-events", "none");
};

/**
 * Draw a single section in the static pass (non-interactive).
 * - Lines go in zoomLayer (follow image pan/zoom).
 * - Text/icons go in uiLayer (constant screen size).
 */
const drawStaticSection = ({
  zoomLayer,
  uiLayer,
  factor,
  dirPoints,
  sectionPoints,
  name,
  imageWidth,
  imageHeight,
  module,
  scale,
  position,
}: DrawSvgSectionLineProps) => {
  const { fx, fy } = normalizeFactor(factor);
  const { resizeFactor, lineColor, textColor } = getSectionStyles(module);

  // Group for this section inside the zoom-following layer
  const g = zoomLayer.append("g").attr("class", "section-layer");

  // Direction line
  if (dirPoints.length > 0) {
    drawLine({
      points: [dirPoints[0], dirPoints[1]],
      group: g,
      color: lineColor,
      resizeFactor,
      fx,
      fy,
      dashed: false,
      className: "static-dir-line",
    });
  }

  // Section line (dashed)
  if (sectionPoints.length > 0) {
    drawLine({
      points: [sectionPoints[0], sectionPoints[1]],
      group: g,
      color: lineColor,
      resizeFactor,
      fx,
      fy,
      dashed: true,
      className: "static-section-line",
    });
  }

  // Static label in UI (same helper used by interactive)
  if (module !== "report" && sectionPoints.length > 0) {
    drawSectionLabel({
      uiLayer,
      text: name,
      points: [sectionPoints[0], sectionPoints[1]],
      viewport: { imageWidth, imageHeight, position, scale },
      factor,
      resizeFactor,
      color: textColor,
      className: "static-section-label",
    });
  }

  // Icons in UI (screen space)
  if (module === "x-sections" && dirPoints.length > 0) {
    const toScreen = toScreenFactory({ imageWidth, imageHeight, position, scale, fx, fy });
    const p0 = toScreen(dirPoints[0]);
    const p1 = toScreen(dirPoints[1]);

    drawIcon(p0, "L", uiLayer, false);
    drawIcon(p1, "R", uiLayer, false);
  }
};
// ...imports y helpers arriba se mantienen iguales...

const toScreenFromZoomFactory = ({
  imageWidth,
  imageHeight,
  position,
  scale,
}: {
  imageWidth: number;
  imageHeight: number;
  position: { x: number; y: number };
  scale: number;
}) => {
  const cx = imageWidth / 2;
  const cy = imageHeight / 2;
  return (p: Point) => ({
    x: position.x + cx + (p.x - cx) * scale,
    y: position.y + cy + (p.y - cy) * scale,
  });
};

const drawInteractiveSection = (
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>,
  zoomLayerNode: SVGGElement,
  startPoint: Point | null,
  endPoint: Point | null,
  sectionPoints: Point[],
  sectionName: string,
  setMousePressed: (pressed: boolean) => void,
  setStartPoint: (point: Point) => void,
  setEndPoint: (point: Point) => void,
  onSetDirPoints: (
    data: { points: Point[]; factor: number; index: number; mode?: string },
    arg2: any
  ) => void,
  factor: number,
  mousePressed: boolean,
  viewport: {
    imageWidth: number;
    imageHeight: number;
    position: { x: number; y: number };
    scale: number;
  }
) => {
  const { resizeFactor, lineColor, textColor } = getSectionStyles("x-sections");

  // Limpieza para evitar acumulación durante drag
  layer.selectAll(".final-line").remove();
  uiLayer.selectAll(".pin-draggable").remove();
  uiLayer.selectAll(".pin-label-draggable").remove();

  // Línea interactiva (zoom-space)
  if (startPoint && endPoint) {
    drawLine({
      points: [startPoint, endPoint],
      group: layer,
      color: lineColor,
      resizeFactor,
      fx: 1,
      fy: 1,
      dashed: false,
      className: "final-line",
    });
  }

  // Línea de sección y etiqueta (como estática) cuando no se está arrastrando
  uiLayer.selectAll(".interactive-section-label").remove();
  if (sectionPoints.length > 0 && !mousePressed) {
    drawLine({
      points: [sectionPoints[0], sectionPoints[1]],
      group: layer,
      color: lineColor,
      resizeFactor,
      fx: factor,
      fy: factor,
      dashed: true,
      className: "final-section-line",
    });

    drawSectionLabel({
      uiLayer,
      text: sectionName,
      points: [sectionPoints[0], sectionPoints[1]],
      viewport,
      factor,
      resizeFactor,
      color: textColor,
      className: "interactive-section-label",
    });
  }

  const dragStartPoint = d3
    .drag<SVGImageElement, unknown>()
    .on("start", () => setMousePressed(true))
    .on("drag", (event) => {
      const [x, y] = d3.pointer(event as any, zoomLayerNode);
      setStartPoint({ x, y });
    })
    .on("end", (event) => {
      setMousePressed(false);
      if (startPoint && endPoint) {
        const [x, y] = d3.pointer(event as any, zoomLayerNode);
        onSetDirPoints({ points: [{ x, y }, endPoint], factor, index: 0 }, null);
      }
    });

  const dragEndPoint = d3
    .drag<SVGImageElement, unknown>()
    .on("start", () => setMousePressed(true))
    .on("drag", (event) => {
      const [x, y] = d3.pointer(event as any, zoomLayerNode);
      setEndPoint({ x, y });
    })
    .on("end", (event) => {
      const [x, y] = d3.pointer(event as any, zoomLayerNode);
      setMousePressed(false);
      if (startPoint && endPoint) {
        onSetDirPoints({ points: [startPoint, { x, y }], factor, index: 1 }, null);
      }
    });

  // Íconos en UI (screen-space)
  const toScreenFromZoom = toScreenFromZoomFactory({
    imageWidth: viewport.imageWidth,
    imageHeight: viewport.imageHeight,
    position: viewport.position,
    scale: viewport.scale,
  });

  if (startPoint) {
    const pScreen = toScreenFromZoom(startPoint);
    const c1 = drawIcon(pScreen, "L", uiLayer, true);
    c1.call(dragStartPoint as any);
  }

  if (endPoint) {
    const pScreen = toScreenFromZoom(endPoint);
    const c2 = drawIcon(pScreen, "R", uiLayer, true);
    c2.call(dragEndPoint as any);
  }
};

export { drawStaticSection, drawInteractiveSection };