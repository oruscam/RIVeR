import * as d3 from "d3";
import { t } from "i18next";
import { COLORS, MARKS } from "../../constants/constants";
import { pinGreen, pinRed, pin } from "../../assets/icons/icons";
import { getPositionSectionText } from "../../../commons/sectionTextPosition";

type Point = { x: number; y: number };

interface DrawSvgStaticSectionProps {
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
  seeAll: boolean;
  isActive?: boolean;
}

export const getResizedPoint = (point: Point, factor: number | { x: number; y: number }) => {
  return {
    x: point.x / (typeof factor === "number" ? factor : factor.x),
    y: point.y / (typeof factor === "number" ? factor : factor.y),
  };
};

const toSectionToken = (name: string) => {
  return (name || "unnamed")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
};

/**
 * Normalize a factor that may be scalar or {x,y} into separate fx/fy.
 */
const normalizeFactor = (factor: number | { x: number; y: number }) => {
  return {
    fx: typeof factor === "number" ? factor : factor.x,
    fy: typeof factor === "number" ? factor : factor.y,
  };
};

/**
 * Style choices for lines and labels by module.
 */
const getSectionStyles = (module: string) => {
  let resizeFactor = 1;
  let lineColor = COLORS.BLACK;
  let textColor = COLORS.BLACK;

  switch (module) {
    case "uav":
      resizeFactor = 1;
      lineColor = COLORS.LIGHT_BLUE;
      textColor = COLORS.MARK_R;
      break;

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
 */
const drawIcon = (
  position: Point,
  type: "L" | "R",
  layer: d3.Selection<SVGGElement, unknown, null, undefined>,
  draggable: boolean,
  extraClass: string = "",
  module: string
) => {
  const isLeft = type === "L";
  const href = module === "uav" ? pin : isLeft ? pinRed : pinGreen;
  const labelColor = module === "uav" ? COLORS.LIGHT_BLUE : isLeft ? COLORS.RED : COLORS.GREEN;

  const icon = layer
    .append("image")
    .attr("href", href)
    .attr("width", MARKS.WIDTH + 5)
    .attr("height", MARKS.HEIGHT + 5)
    .attr("x", position.x - MARKS.OFFSET_X)
    .attr("y", position.y - MARKS.OFFSET_Y)
    .attr("cursor", draggable ? "move" : "default")
    .attr("pointer-events", draggable ? "all" : "none")
    .attr("class", `pin-${draggable ? "draggable" : "static"} pin-${type} ${extraClass}`.trim());

  const badgeText =
    module === "uav"
      ? type === "L" ? "1" : "2"
      : type === "L"
        ? t("CrossSections.bankLeft")
        : t("CrossSections.bankRight");
  const badgeWidth = 20;
  const badgeHeight = 16;
  const badgeX = position.x - badgeWidth / 2;
  const badgeY = position.y - MARKS.OFFSET_Y - 14;

  const badge = layer
    .append("g")
    .attr("class", `pin-label-${draggable ? "draggable" : "static"} pin-label-${type} ${extraClass}`.trim())
    .attr("pointer-events", "none");

  badge
    .append("rect")
    .attr("x", badgeX)
    .attr("y", badgeY)
    .attr("width", badgeWidth)
    .attr("height", badgeHeight)
    .attr("rx", 3)
    .attr("ry", 3)
    .attr("fill", "rgba(50,50,50,0.85)");

  badge
    .append("text")
    .attr("x", position.x)
    .attr("y", badgeY + badgeHeight / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .text(badgeText)
    .attr("font-size", 11)
    .attr("font-weight", "600")
    .attr("fill", labelColor);

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
  points: [Point, Point];
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

  const { point, rotation } = getPositionSectionText(
    points[0],
    points[1],
    viewport.imageWidth,
    viewport.imageHeight,
    typeof factor === "number" ? factor : fx
  );

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
    .attr("font-size", 20 / resizeFactor)
    .attr("fill", color)
    .attr("font-weight", "500")
    .attr("transform", `rotate(${rotation}, ${screenPoint.x}, ${screenPoint.y})`)
    .attr("pointer-events", "none");
};

/**
 * Draw a single section in the static pass (non-interactive).
 * - Lines go in zoomLayer (follow image pan/zoom) for x-sections and processing.
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
  seeAll,
  isActive = true,
}: DrawSvgStaticSectionProps) => {
  const { fx, fy } = normalizeFactor(factor);
  const { resizeFactor, lineColor, textColor } = getSectionStyles(module);

  const token = toSectionToken(name);
  const sectionClass = `section-${token}`;

  const isXSections = module === "x-sections";
  const isProcessing = module === "processing";
  const useZoomLayer = isXSections || isProcessing;

  if (seeAll === false && module === "x-sections") {
    zoomLayer.selectAll(`.${sectionClass}`).remove();
    uiLayer.selectAll(`.${sectionClass}`).remove();
    return;
  }

  if (seeAll === false && !isActive && module === "results") {
    zoomLayer.selectAll(`.${sectionClass}`).remove();
    uiLayer.selectAll(`.${sectionClass}`).remove();
    return;
  }

  // Clean only this section to avoid duplicates
  zoomLayer.selectAll(`.${sectionClass}`).remove();
  uiLayer.selectAll(`.${sectionClass}`).remove();

  // Group inside zoom layer for this section
  const g = zoomLayer.append("g").attr("class", `section-layer ${sectionClass}`);

  // Direction line
  if (dirPoints.length > 0) {
    drawLine({
      points: [dirPoints[0], dirPoints[1]],
      group: useZoomLayer ? g : uiLayer,
      color: lineColor,
      resizeFactor,
      fx,
      fy,
      dashed: false,
      className: `static-dir-line ${sectionClass}`,
    });
  }

  // Section line (dashed)
  if (sectionPoints.length > 0) {
    drawLine({
      points: [sectionPoints[0], sectionPoints[1]],
      group: useZoomLayer ? g : uiLayer,
      color: lineColor,
      resizeFactor,
      fx,
      fy,
      dashed: true,
      className: `static-section-line ${sectionClass}`,
    });
  }

  // Label in UI (screen space)
  if (module !== "report" && sectionPoints.length > 0) {
    drawSectionLabel({
      uiLayer,
      text: name,
      points: [sectionPoints[0], sectionPoints[1]],
      viewport: { imageWidth, imageHeight, position, scale },
      factor,
      resizeFactor,
      color: textColor,
      className: `static-section-label ${sectionClass}`,
    });
  }

  // Icons in UI (screen space)
  if (module === "x-sections" && dirPoints.length > 0) {
    const toScreen = toScreenFactory({ imageWidth, imageHeight, position, scale, fx, fy });
    const p0 = toScreen(dirPoints[0]);
    const p1 = toScreen(dirPoints[1]);

    drawIcon(p0, "L", uiLayer, false, sectionClass, module);
    drawIcon(p1, "R", uiLayer, false, sectionClass, module);
  }
};

// ---- Interactive (x-sections) ----

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

interface DrawSvgInteractiveSectionProps {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  zoomLayerNode: SVGGElement;
  startPoint: Point | null;
  endPoint: Point | null;
  sectionPoints?: Point[];
  name?: string;
  setMousePressed: (pressed: boolean) => void;
  setStartPoint: (point: Point) => void;
  setEndPoint: (point: Point) => void;
  onSetDirPoints: (
    data: { points: Point[]; factor: number; index: number; mode?: string },
    arg2: any
  ) => void;
  factor: number | { x: number; y: number };
  mousePressed: boolean;
  viewport: {
    imageWidth: number;
    imageHeight: number;
    position: { x: number; y: number };
    scale: number;
  };
  module: string;
}

const drawInteractiveSection = ({
  layer,
  uiLayer,
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
  viewport,
  module,
}: DrawSvgInteractiveSectionProps) => {
  const { resizeFactor, lineColor, textColor } = getSectionStyles(module);

  const token = toSectionToken(name ? name : "uav");
  const sectionClass = `section-${token}`;

  // Clean only this section while dragging
  layer.selectAll(`.${sectionClass}`).remove();
  uiLayer.selectAll(`.${sectionClass}`).remove();

  // Interactive line (zoom-space)
  if (startPoint && endPoint) {
    drawLine({
      points: [startPoint, endPoint],
      group: layer,
      color: lineColor,
      resizeFactor,
      fx: 1,
      fy: 1,
      dashed: false,
      className: `final-line ${sectionClass}`,
    });
  }

  // Section dashed line + label when not dragging
  if (sectionPoints !== undefined && sectionPoints.length > 0 && !mousePressed) {
    drawLine({
      points: [sectionPoints[0], sectionPoints[1]],
      group: layer,
      color: lineColor,
      resizeFactor,
      fx: typeof factor === "number" ? factor : factor.x,
      fy: typeof factor === "number" ? factor : factor.y,
      dashed: true,
      className: `final-section-line ${sectionClass}`,
    });

    drawSectionLabel({
      uiLayer,
      text: name || "",
      points: [sectionPoints[0], sectionPoints[1]],
      viewport,
      factor,
      resizeFactor,
      color: textColor,
      className: `interactive-section-label ${sectionClass}`,
    });
  }

  // Proyección de zoom-space -> screen-space para los íconos
  const toScreenFromZoom = toScreenFromZoomFactory({
    imageWidth: viewport.imageWidth,
    imageHeight: viewport.imageHeight,
    position: viewport.position,
    scale: viewport.scale,
  });

  // Drag para startPoint: usa subject + container(zoomLayerNode) para mantener el offset
  const dragStartPoint = d3
    .drag<SVGImageElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode) // coordenadas del puntero en zoom-space
    .on("start", () => setMousePressed(true))
    .on("drag", function (event) {
      const x = event.x;
      const y = event.y;

      // Actualiza el modelo en zoom-space
      setStartPoint({ x, y });

      // Mueve el ícono en screen-space inmediatamente
      const pScreen = toScreenFromZoom({ x, y });
      d3.select<SVGImageElement, unknown>(this)
        .attr("x", pScreen.x - MARKS.OFFSET_X)
        .attr("y", pScreen.y - MARKS.OFFSET_Y);
    })
    .on("end", function (event) {
      setMousePressed(false);
      if (endPoint) {
        const x = event.x;
        const y = event.y;
        onSetDirPoints({ points: [{ x, y }, endPoint], factor: factor as number, index: 0 }, null);
      }
    });

  if (startPoint) {
    dragStartPoint.subject(() => ({ x: startPoint.x, y: startPoint.y }));
  }

  // Drag para endPoint: igual patrón subject + container(zoomLayerNode)
  const dragEndPoint = d3
    .drag<SVGImageElement, unknown, { x: number; y: number }>()
    .container(() => zoomLayerNode)
    .subject(() => {
      if (endPoint) {
        return { x: endPoint.x, y: endPoint.y }
      } else {
        return { x: 0, y: 0}
      }})
    .on("start", () => setMousePressed(true))
    .on("drag", function (event) {
      const x = event.x;
      const y = event.y;

      setEndPoint({ x, y });

      const pScreen = toScreenFromZoom({ x, y });
      d3.select<SVGImageElement, unknown>(this)
        .attr("x", pScreen.x - MARKS.OFFSET_X)
        .attr("y", pScreen.y - MARKS.OFFSET_Y);
    })
    .on("end", function (event) {
      setMousePressed(false);
      if (startPoint) {
        const x = event.x;
        const y = event.y;
        onSetDirPoints({ points: [startPoint, { x, y }], factor: factor as number, index: 1 }, null);
      }
    });

  // Icons in UI (screen-space)
  if (startPoint) {
    const pScreen = toScreenFromZoom(startPoint);
    const c1 = drawIcon(pScreen, "L", uiLayer, true, sectionClass, module);
    c1.call(dragStartPoint as any);
  }

  if (endPoint) {
    const pScreen = toScreenFromZoom(endPoint);
    const c2 = drawIcon(pScreen, "R", uiLayer, true, sectionClass, module);
    c2.call(dragEndPoint as any);
  }
};

export { drawStaticSection, drawInteractiveSection };