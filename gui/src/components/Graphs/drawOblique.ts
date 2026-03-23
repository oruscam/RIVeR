import * as d3 from 'd3';
import { pin, pinRed } from '../../assets/icons/icons'; 
import { COLORS, MARKS } from '../../constants/constants';

interface drawObliqueProps {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  localPoints: { x: number; y: number }[];
  setLocalPoints?: (points: { x: number; y: number }[]) => void;
  factor: number;
  setMousePressed: (value: boolean) => void;
  setPointsInStore: (payload: { points: { x: number; y: number }[]; factor: number; index: number }, event: any) => void;
  scale: number;
  isDefaultCoordinates: boolean;
}

export const drawOblique = ({
  layer,
  uiLayer,
  localPoints,
  setLocalPoints,
  factor,
  setMousePressed,
  setPointsInStore,
  scale,
  isDefaultCoordinates,
}: drawObliqueProps) => {
  const dragPoint = d3
    .drag<SVGImageElement, { index: number }, { x: number; y: number }>()
    .subject((event, d) => {
      const p = localPoints[d.index];
      return { x: p.x, y: p.y };
    })
    .on("start", function () {
      setMousePressed(true);
      // Trae la imagen al frente al iniciar el drag
      d3.select<SVGImageElement, { index: number }>(this).raise();
    })
    .on("drag", function (event, d) {
      const x = event.x;
      const y = event.y;

      const next = [...localPoints];
      next[d.index] = { x, y };
      setLocalPoints?.(next);

      d3.select<SVGImageElement, { index: number }>(this)
        .attr("x", x - MARKS.OFFSET_X)
        .attr("y", y - MARKS.OFFSET_Y);
    })
    .on("end", function (event, d) {
      setMousePressed(false);

      const x = event.x;
      const y = event.y;
      const next = [...localPoints];
      next[d.index] = { x, y };

      setPointsInStore({ points: next, factor, index: d.index }, null);
    });

    layer.selectAll("*").remove();
    uiLayer.selectAll("*").remove();

    // Dibuja líneas y pins
    localPoints.forEach((point, i) => {
      if ( isDefaultCoordinates && i !== 0 ) return
      // Líneas de los lados
        layer
        .append("line")
        .attr("x1", point.x)
        .attr("y1", point.y)
        .attr("x2", localPoints[(i + 1) % localPoints.length].x)
        .attr("y2", localPoints[(i + 1) % localPoints.length].y)
        .attr("stroke", () => {
            switch (i) {
            case 0:
                return COLORS.CONTROL_POINTS.D12;
            case 1:
                return COLORS.CONTROL_POINTS.D23;
            case 2:
                return COLORS.CONTROL_POINTS.D34;
            case 3:
                return COLORS.CONTROL_POINTS.D14;
            default:
                return COLORS.CONTROL_POINTS.D12;
            }
        })
        .attr("stroke-width", MARKS.STROKE_WIDTH / scale)
        .attr("pointer-events", "none");

        if (isDefaultCoordinates) return
        // Diagonales
        layer
            .append("line")
            .attr("x1", point.x)
            .attr("y1", point.y)
            .attr("x2", localPoints[(i + 2) % localPoints.length].x)
            .attr("y2", localPoints[(i + 2) % localPoints.length].y)
            .attr("stroke", () => {
                switch (i) {
                case 2:
                    return COLORS.CONTROL_POINTS.D13;
                case 3:
                    return COLORS.CONTROL_POINTS.D24;
                default:
                    return COLORS.CONTROL_POINTS.D13;
                }
            })
            .attr("stroke-width", MARKS.STROKE_WIDTH / scale)
            .attr("pointer-events", "none");
    })
    
    localPoints.forEach((point, i) => {
      if ( isDefaultCoordinates && i !== 0 ) return

        // Pin
        layer
            .append("image")
            .attr("href", i === 0 ? pinRed : pin)
            .attr("width", (MARKS.WIDTH + 5) / scale)
            .attr("height", (MARKS.HEIGHT + 5) / scale)
            .datum({ index: i })
            .attr("x", point.x - MARKS.OFFSET_X / scale)
            .attr("y", point.y - MARKS.OFFSET_Y / scale)
            .attr("cursor", "move")
            .call(dragPoint as any);

        // Etiqueta
        layer
            .append("text")
            .attr("x", point.x)
            .attr("y", point.y - 12 / scale)
            .attr("text-anchor", "middle")
            .attr("font-size", 20 / scale)
            .attr("font-weight", "600")
            .attr("fill", i === 0 ? COLORS.MARK_L : COLORS.MARK_R)
            .attr("pointer-events", "none")
            .text(`${i + 1}`);
        });
}