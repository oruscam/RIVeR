import * as d3 from "d3";
import { COLORS, MARKS } from "../../constants/constants";
import { getPositionSectionText } from "../../helpers";
import { pinGreen, pinRed } from "../../assets/icons/icons";

interface drawSvgSectionLineProps {
  zoomLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  factor: number | { x: number; y: number };
  dirPoints: { x: number; y: number }[];
  sectionPoints: { x: number; y: number }[];
  name: string;
  imageWidth: number;
  imageHeight: number;
  module: string;
  scale: number;
  position: { x: number; y: number };
}

const getResizedPoint = (point: { x: number; y: number }, factor: number) => {
    return {
        x: point.x / factor,
        y: point.y / factor,
    };
}

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
  }

  return {
    resizeFactor,
    lineColor,
    textColor,
  }
}

const drawDirLine = (dirPoints: { x: number; y: number }[], group: d3.Selection<SVGGElement, unknown, null, undefined>, color: string, resizeFactor: number, fx: number, fy: number) => {
  const interactive = fx === 1 && fy === 1;

    group.append("line")
      .attr("id", interactive ? "final-line" : "static-dir-line")
      .attr("x1", dirPoints[0].x / fx)
      .attr("y1", dirPoints[0].y / fy)
      .attr("x2", dirPoints[1].x / fx)
      .attr("y2", dirPoints[1].y / fy)
      .attr("stroke", color)
      .attr("stroke-width", 4 / resizeFactor)
      .attr("stroke-linecap", "round")
      .attr("vector-effect", "non-scaling-stroke");
}

const drawIcon = (position: { x: number; y: number }, type: 'L' | 'R', layer: d3.Selection<SVGGElement, unknown, null, undefined>, draggable: boolean) => {
  let icon 
  if (type === 'L') {
    icon = layer
      .append("image")
      .attr("xlink:href", pinRed)
      .attr("width", MARKS.WIDTH + 5)
      .attr("height", MARKS.HEIGHT + 5)
      .attr("x", position.x - MARKS.OFFSET_X - 2)
      .attr("y", position.y - MARKS.OFFSET_Y -2)
      .attr("cursor", draggable ? "move" : "default")
      .attr("pointer-events", draggable ? "all" : "none");

    layer
      .append("text")
      .attr("x", position.x - 5)
      .attr("y", position.y - 20)
      .text("L")
      .attr('font-size', 19)
      .attr('font-weight', '600')
      .attr("fill", COLORS.MARK_L)
      .attr("pointer-events", "none");
  } else {
    icon = layer
      .append("image")
      .attr("xlink:href", pinGreen)
      .attr("width", MARKS.WIDTH + 5)
      .attr("height", MARKS.HEIGHT + 5)
      .attr("x", position.x - MARKS.OFFSET_X)
      .attr("y", position.y - MARKS.OFFSET_Y - 2)
      .attr("cursor", draggable ? "move" : "default")
      .attr("pointer-events", draggable ? "all" : "none");

    layer
      .append("text")
      .attr("x", position.x - 4)
      .attr("y", position.y - 20)
      .text("R")
      .attr('font-size', 19)
      .attr('font-weight', '600')
      .attr("fill", COLORS.MARK_R)
      .attr("pointer-events", "none");
  }

  return icon
}

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
}: drawSvgSectionLineProps) => {
  const fx = typeof factor === "number" ? factor : factor.x;
  const fy = typeof factor === "number" ? factor : factor.y;

  const cx = imageWidth / 2;
  const cy = imageHeight / 2;

  const { resizeFactor, lineColor, textColor } = getSectionStyles(module);

  // Grupo por sección dentro de la capa que se mueve/escala con la imagen
  const g = zoomLayer.append("g").attr("class", "section-layer");

  // Línea de la sección (sigue a la imagen, grosor constante con non-scaling-stroke)
  if (sectionPoints.length > 0) {
    g.append("line")
      .attr("x1", sectionPoints[0].x / fx)
      .attr("y1", sectionPoints[0].y / fy)
      .attr("x2", sectionPoints[1].x / fx)
      .attr("y2", sectionPoints[1].y / fy)
      .attr("stroke", lineColor)
      .attr("stroke-width", 3.75 / resizeFactor)
      .attr("stroke-linecap", "round")
      .attr("stroke-dasharray", "5,10")
      .attr("vector-effect", "non-scaling-stroke");
  }

  // Dir Line
  if (dirPoints.length > 0) {
    drawDirLine(dirPoints, g, lineColor, resizeFactor, fx, fy);
  }

  // Convertir a coordenadas de pantalla con origen en el centro
  const toScreen = (p: { x: number; y: number }) => {
    const px = p.x / fx;
    const py = p.y / fy;
    return {
      x: position.x + cx + (px - cx) * scale,
      y: position.y + cy + (py - cy) * scale,
    };
  };

  // Texto (tamaño constante en pantalla)
  if (module !== "report" && sectionPoints.length > 0) {
    const { point, rotation } = getPositionSectionText(
      sectionPoints[0],
      sectionPoints[1],
      imageWidth!,
      imageHeight!,
      factor as number
    );

    const screenPoint = toScreen(point);

    uiLayer
      .append("text")
      .attr("x", screenPoint.x)
      .attr("y", screenPoint.y)
      .attr("dy", 25)
      .text(name)
      .attr("font-size", 23 / resizeFactor)
      .attr("fill", textColor)
      .attr('font-weight', '500')
      .attr("transform", `rotate(${rotation}, ${screenPoint.x}, ${screenPoint.y})`);
  }

  // Íconos (tamaño constante en pantalla)
  if (module === "x-sections" && dirPoints.length > 0) {
    const p0 = toScreen(dirPoints[0]);
    const p1 = toScreen(dirPoints[1]);

    drawIcon(p0, 'L', uiLayer, false);
    drawIcon(p1, 'R', uiLayer, false);
  }
};

const drawInteractiveSection = (
    layer: d3.Selection<SVGGElement, unknown, null, undefined>,
    zoomLayerNode: SVGGElement,
    startPoint: { x: number; y: number } | null,
    endPoint: { x: number; y: number } | null,
    dirPoints: { x: number; y: number }[],
    sectionPoints: { x: number; y: number }[],
    setMousePressed: (pressed: boolean) => void,
    setStartPoint: (point: { x: number; y: number }) => void,
    setEndPoint: (point: { x: number; y: number }) => void,
    onSetDirPoints: (
      data: { points: { x: number; y: number }[]; factor: number; index: number; mode?: string },
      arg2: any
    ) => void,
    factor: number,
    activeSection: number,
    mousePressed: boolean
) => {

        const { resizeFactor, lineColor } = getSectionStyles('x-sections');

        // Draw section line
        if ( startPoint && endPoint) {
          drawDirLine([startPoint, endPoint], layer, lineColor, resizeFactor,1,1);
        }

          // Línea de la sección (sigue a la imagen, grosor constante con non-scaling-stroke)
        if (sectionPoints.length > 0 && !mousePressed) {
          layer.append("line")
            .attr("x1", sectionPoints[0].x / factor)
            .attr("y1", sectionPoints[0].y / factor)
            .attr("x2", sectionPoints[1].x / factor)
            .attr("y2", sectionPoints[1].y / factor)
            .attr("stroke", lineColor)
            .attr("stroke-width", 3.75 / resizeFactor)
            .attr("stroke-linecap", "round")
            .attr("stroke-dasharray", "5,10")
            .attr("vector-effect", "non-scaling-stroke");
        }
    
        // Drag behavior: calcula puntero en coords del zoomLayer
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
    
              onSetDirPoints(
                {
                  points: [{ x, y }, endPoint],
                  factor,
                  index: 0,
                },
                null
              );
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
              onSetDirPoints(
                {
                  points: [startPoint, { x,y}],
                  factor,
                  index: 1,
                },
                null
              );
            }
          });
    
        // Icons
        if (startPoint) {
          const c1 = drawIcon(startPoint, 'L', layer, true);
    
          if (dirPoints.length > 0) {
            c1.call(dragStartPoint);
          } else {
            c1.on("mousedown", () => setMousePressed(true));
          }
        }
    
        if (endPoint) {
          const c2 = drawIcon(endPoint, 'R', layer, true);
    
          if (dirPoints.length > 0) {
            c2.call(dragEndPoint);
          }
        }
};


export { drawStaticSection, drawInteractiveSection, getResizedPoint };