import * as d3 from 'd3';
import { pinRed, pin, pinGrey } from '../../assets/icons/icons';
import { COLORS, MARKS } from '../../constants/constants';
import { IpcamPoint, SetPointPixelCoordinatesProps } from '../../store/ipcam/types';

interface drawIpcamProps {
  layer: d3.Selection<SVGGElement, unknown, null, undefined>;
  uiLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  localPoints: IpcamPoint[] | null;
  factor: number;
  scale: number;
  width: number;
  height: number;
  activePoint: number | null;
  setMousePressed: ( value: boolean ) => void;
  onSetPointInStore: ( props: SetPointPixelCoordinatesProps) => void;
  onSetActivePoint: ( index: number ) => void;
  cameraSolution: any | null;
}

const drawIpcam = ({ layer, uiLayer, localPoints, factor, scale, width, height, activePoint, setMousePressed, onSetPointInStore, onSetActivePoint, cameraSolution }: drawIpcamProps) => {
    d3.selectAll(layer.selectAll("*")).remove();
    d3.selectAll(uiLayer.selectAll("*")).remove();

    // Draw each point
    if (localPoints === null) return;

    const dragPoint = d3
        .drag<SVGImageElement, { index: number }, { x: number; y: number }>()
        .subject((event) => ({ x: event.x, y: event.y }))
        .on("start", function (_event, d) {
            onSetActivePoint( d.index );
            d3.select(this.ownerSVGElement).style("cursor", "default");
        })
        .on("drag", function (event, d) {
          if ( activePoint !== d.index ) return;
          setMousePressed(true);

          const x = Math.max(0, Math.min(width, event.x));
          const y = Math.max(0, Math.min(height, event.y));

          d3.select<SVGImageElement, { index: number }>(this)
            .attr("x", x - MARKS.IPCAM_OFFSET_X / scale)
            .attr("y", y - MARKS.IPCAM_OFFSET_Y / scale);
        })
        .on("end", function (event, d) {
          if ( activePoint !== d.index ) return;

          setMousePressed(false);
          d3.select(this.ownerSVGElement).style("cursor", null);

          const x = Math.max(0, Math.min(width, event.x));
          const y = Math.max(0, Math.min(height, event.y));

          onSetPointInStore({ index: d.index, point: { x: x * factor, y: y * factor }});
        });

    localPoints.forEach((point, index) => {
        if ( cameraSolution === null && point.selected === false ) return;
        if ( point.wasEstablished === false && activePoint !== index ) return;

        if (cameraSolution !== null ){          
          drawEllipses(point, layer, factor, scale);
          drawProjectionPoint(point, layer, factor, scale)
        }      

        layer
            .append("image")
            .attr("xlink:href", getIcon(index, activePoint, point.selected))
            .attr("x", point.x  - ( MARKS.IPCAM_OFFSET_X / scale ))
            .attr("y", point.y  - ( MARKS.IPCAM_OFFSET_Y / scale ))
            .datum({ index })
            .attr("width", MARKS.WIDTH / scale)
            .attr("height", MARKS.HEIGHT / scale)
            .attr("cursor", "default")
            .call(dragPoint);
    });
}

const getIcon = ( index: number, activePoint: number | null, selected: boolean ) => {
  if ( activePoint === index ) {
    return pinRed;
  } else {
    if (selected) {
      return pin
    } else {
      return pinGrey
    }
  }
}

const transformPointCoordinates = ( points: IpcamPoint[] | null, factor: number ): IpcamPoint[] | null => {
    if ( points === null ) return null;
    return points.map( ( point ) => ( { ...point, x: point.x / factor, y: point.y / factor } ) );
}

const drawEllipses = (point: IpcamPoint, layer: d3.Selection<SVGGElement, unknown, null, undefined>, factor: number, scale: number) => {
  const { ellipse } = point
  if (ellipse === null || ellipse === undefined) return
  if (point.selected === false) return;

  const [x, y] = ellipse.center;
  const width = ellipse.width / (factor * 1.8);
  const height = ellipse.height / (factor * 1.8);
  const angle = ellipse.angle;

  layer
    .append("ellipse")
    .attr('cx', (x / factor))
    .attr('cy', (y / factor))
    .attr('rx', width)
    .attr('ry', height)
    .attr(
      'transform',
      `rotate(${angle}, ${(x / factor)}, ${(y / factor)})`
    )
    .attr('fill', COLORS.ELLIPSE.FILL)
    .attr('stroke', COLORS.ELLIPSE.STROKE)
    .attr('stroke-width', 1);
}

const drawProjectionPoint = (point: IpcamPoint, layer: d3.Selection<SVGGElement, unknown, null, undefined>, factor: number, scale: number) => {
  const { projectedPoint, x, y } = point;
  if (projectedPoint === null || projectedPoint === undefined) return;
  if (point.selected === false) return;

  const [projectedX, projectedY] = projectedPoint;

  // Draw Line from ipcam point to projection point
  layer
    .append("line")
    .attr("x1", x)
    .attr("y1", y)
    .attr("x2", projectedX / factor)
    .attr("y2", projectedY / factor)
    .attr("stroke", COLORS.RED)
    .attr("stroke-width", 3 / scale)

  // Draw projection point
  layer
    .append("circle")
    .attr("cx", projectedX / factor)
    .attr("cy", projectedY / factor)
    .attr("r", 3 / scale)
    .attr("fill", COLORS.RED);
}


export { drawIpcam, transformPointCoordinates };