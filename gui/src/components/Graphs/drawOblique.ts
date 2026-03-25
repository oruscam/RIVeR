import * as d3 from 'd3';
import { pin, pinRed } from '../../assets/icons/icons';
import { COLORS, MARKS } from '../../constants/constants';
import { getDistanceColors } from '../../helpers/getCSSVar';

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

    // Dibuja líneas y pins — colors read from current theme's CSS variables
    const DC = getDistanceColors();

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
            case 0: return DC.D12;
            case 1: return DC.D23;
            case 2: return DC.D34;
            case 3: return DC.D14;
            default: return DC.D12;
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
                case 2: return DC.D13;
                case 3: return DC.D24;
                default: return DC.D13;
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

        // Badge label
        const badgeWidth = 18 / scale;
        const badgeHeight = 14 / scale;
        const badgeX = point.x - badgeWidth / 2;
        const badgeY = point.y - (MARKS.OFFSET_Y + 14) / scale;

        layer
            .append("rect")
            .attr("x", badgeX)
            .attr("y", badgeY)
            .attr("width", badgeWidth)
            .attr("height", badgeHeight)
            .attr("rx", 3 / scale)
            .attr("ry", 3 / scale)
            .attr("fill", "rgba(50,50,50,0.85)")
            .attr("pointer-events", "none");

        layer
            .append("text")
            .attr("x", point.x)
            .attr("y", badgeY + badgeHeight / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("font-size", 10 / scale)
            .attr("font-weight", "600")
            .attr("fill", i === 0 ? COLORS.RED : COLORS.LIGHT_BLUE)
            .attr("pointer-events", "none")
            .text(`${i + 1}`);
        });
}