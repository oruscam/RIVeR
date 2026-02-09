import * as d3 from "d3";
import { pinRed, pinGreen } from "../../assets/icons/icons";

const getResizedPoint = (point: { x: number; y: number }, factor: number) => {
    return {
        x: point.x / factor,
        y: point.y / factor,
    };
}

const drawInteractiveSection = (
    layer: d3.Selection<SVGGElement, unknown, null, undefined>,
    zoomLayerNode: SVGGElement,
    startPoint: { x: number; y: number } | null,
    endPoint: { x: number; y: number } | null,
    dirPoints: { x: number; y: number }[],
    mousePressed: boolean,
    setMousePressed: (pressed: boolean) => void,
    setStartPoint: (point: { x: number; y: number }) => void,
    setEndPoint: (point: { x: number; y: number }) => void,
    onSetDirPoints: (
      data: { points: { x: number; y: number }[]; factor: number; index: number },
      arg2: any
    ) => void,
    factor: number,
    activeSection: number
) => {
        const hasBothPoints = !!startPoint && !!endPoint;
        const shouldDrawFinalLine = hasBothPoints && dirPoints.length > 0;
        const shouldDrawPreviewLine = !!startPoint && mousePressed && !!endPoint && dirPoints.length === 0;
    
        // Línea: final o preview
        if (shouldDrawFinalLine) {
          layer
            .append("line")
            .attr("id", "final-line")
            .attr("x1", startPoint!.x)
            .attr("y1", startPoint!.y)
            .attr("x2", endPoint!.x)
            .attr("y2", endPoint!.y)
            .attr("stroke", "red")
            .attr("stroke-width", 2);
        } else if (shouldDrawPreviewLine) {
          layer
            .append("line")
            .attr("id", "preview-line")
            .attr("x1", startPoint!.x)
            .attr("y1", startPoint!.y)
            .attr("x2", endPoint!.x)
            .attr("y2", endPoint!.y)
            .attr("stroke", "rgba(255,0,0,0.6)")
            .attr("stroke-dasharray", "4 4")
            .attr("stroke-width", 2);
        }
    
        // Drag behavior: calcula puntero en coords del zoomLayer
        const dragStartPoint = d3
          .drag<SVGCircleElement, unknown>()
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
                  index: activeSection,
                },
                null
              );
            }
          });
    
        const dragEndPoint = d3
          .drag<SVGCircleElement, unknown>()
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
                  index: activeSection,
                },
                null
              );
            }
          });
    
        // Círculos
        if (startPoint) {
          const c1 = layer
            .append("circle")
            .attr("id", "start-point-circle")
            .attr("cx", startPoint.x)
            .attr("cy", startPoint.y)
            .attr("r", 10)
            .attr("fill", "rgba(255, 0, 0, 0.5)")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .style("cursor", "move")
            .style("pointer-events", "all");
    
          if (dirPoints.length > 0) {
            c1.call(dragStartPoint);
          } else {
            c1.on("mousedown", () => setMousePressed(true));
          }
        }
    
        if (endPoint) {
          const c2 = layer
            .append("circle")
            .attr("id", "end-point-circle")
            .attr("cx", endPoint.x)
            .attr("cy", endPoint.y)
            .attr("r", 10)
            .attr("fill", "rgba(255, 0, 0, 0.5)")
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .style("cursor", "move")
            .style("pointer-events", "all");
    
          if (dirPoints.length > 0) {
            c2.call(dragEndPoint);
          }
        }
};



// export { getResizedPoint, drawInteractiveSection}