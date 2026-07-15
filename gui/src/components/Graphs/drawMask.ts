import * as d3 from 'd3';
import type { RefObject } from 'react';

/**
 * Floating badge label above a mask (or any point), same visual style as the
 * region labels used for stabilization: dark rounded chip, auto-sized to fit
 * the text. `key` scopes the label so multiple independent labels can be
 * drawn into the same layer without clobbering each other.
 */
export const drawMaskLabel = (
  svg: d3.Selection<SVGSVGElement | SVGGElement, unknown, HTMLElement, any>,
  key: string,
  text: string,
  x: number,
  y: number,
  size: (px: number) => number,
  // Viewport-space bounds the label's background box must stay fully inside —
  // same "never leave the visible screen" rule as the mask/region confirm buttons.
  bounds: { width: number; height: number }
) => {
  const className = `mask-label-${key}`;
  let label = svg.select<SVGGElement>(`g.${className}`);

  if (label.empty()) {
    label = svg.append('g').attr('class', `mask-label ${className}`).style('pointer-events', 'none');
    label.append('rect').attr('rx', 3).attr('ry', 3).attr('fill', 'rgba(50, 50, 50, 0.85)');
    label
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-weight', 600)
      .attr('fill', '#ED6B57');
  }

  const textEl = label
    .select<SVGTextElement>('text')
    .style('font-size', `${size(13)}px`)
    .attr('x', x)
    .attr('y', y)
    .text(text);

  const node = textEl.node();
  let dx = 0;
  let dy = 0;
  if (node) {
    const bbox = node.getBBox();
    const padX = size(6);
    const padY = size(3);
    const left = bbox.x - padX;
    const right = bbox.x + bbox.width + padX;
    const top = bbox.y - padY;
    const bottom = bbox.y + bbox.height + padY;

    if (left < 0) dx = -left;
    else if (right > bounds.width) dx = bounds.width - right;
    if (top < 0) dy = -top;
    else if (bottom > bounds.height) dy = bounds.height - bottom;

    label
      .select<SVGRectElement>('rect')
      .attr('x', bbox.x - padX)
      .attr('y', bbox.y - padY)
      .attr('width', bbox.width + padX * 2)
      .attr('height', bbox.height + padY * 2);
  }

  label.attr('transform', `translate(${dx}, ${dy})`);
  label.raise();
};

/**
 * Renders an interactive SVG mask editor with:
 * - A filled polygon representing the mask
 * - Dashed edges between mask points
 * - Edge midpoint "+" controls to insert new points
 * - Draggable control points
 * - "Drag entire mask" gesture by pressing down inside the polygon (keep the mouse button held)
 *
 * Coordinate spaces:
 * - Image space: persisted data
 * - Viewport space: rendered overlay (image -> viewport: x/factor, y/factor)
 */
export const drawMask = (
  svg: d3.Selection<SVGSVGElement | SVGGElement, unknown, HTMLElement, any>,
  svgRef: RefObject<SVGSVGElement>,
  addPoint: (index: number, x: number, y: number) => void,
  setDragStart: (point: { x: number; y: number } | null) => void,
  // CRÍTICO: ahora setDragging recibe el id del punto, no el índice
  setDragging: (id: number | string | null) => void,
  setDraggingAll: (draggingAll: boolean) => void,
  points: { id: string | number; x: number; y: number }[],
  transformToViewport: (x: number, y: number) => { x: number; y: number },
  transformToImage: (x: number, y: number) => { x: number; y: number },
  zoomFactor: number,
  label: string,
  bounds: { width: number; height: number }
) => {
  const isFirstRender = svg.select('defs').empty();

  // Compensar tamaños por el zoom actual para que queden en "px de pantalla"
  const size = (px: number) => px / (zoomFactor || 1);

  const t = svg.transition().duration(0).ease(d3.easeQuadOut);

  if (isFirstRender) {
    const defs = svg.append('defs');
    const pattern = defs
      .append('pattern')
      .attr('id', 'dashFill')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 10)
      .attr('height', 10);

    pattern
      .append('path')
      .attr('d', 'M0 10 L10 0')
      .attr('stroke', '#ED6B57')
      .attr('stroke-width', 1);
  }

  const transformedPoints = points.map((p) => transformToViewport(p.x, p.y));
  const polygonPoints = transformedPoints.map((p) => `${p.x},${p.y}`).join(' ');

  if (transformedPoints.length > 0) {
    // Anchor to the mask's own topmost vertex rather than the bounding box's
    // horizontal center — for elongated/diagonal masks the bbox center can sit
    // far from the actual polygon, leaving the label floating away from it.
    const topPoint = transformedPoints.reduce((top, p) => (p.y < top.y ? p : top));
    drawMaskLabel(svg, 'active', label, topPoint.x, topPoint.y - size(14), size, bounds);
  }

  let polygon = svg.select<SVGPolygonElement>('polygon.mask-polygon');
  if (polygon.empty()) {
    polygon = svg
      .append('polygon')
      .attr('class', 'mask-polygon')
      .attr('fill', 'url(#dashFill)')
      .attr('stroke', 'none')
      .attr('points', polygonPoints);
  } else {
    polygon.transition(t as any).attr('points', polygonPoints);
  }

  polygon.style('pointer-events', 'auto').style('cursor', 'move');

  polygon.on('mousedown', function (event) {
    // Use the same coordinate space as the mousemove handler (d3.pointer against
    // the zoomed group) instead of svgRef's un-zoomed rect — otherwise the first
    // move after mousedown jumps by the current zoom/pan offset before tracking correctly.
    const [vx, vy] = d3.pointer(event, this);
    setDragStart({ x: vx, y: vy });
    setDraggingAll(true);
  });

  // Edges
  const edgesData = points.map((a, i) => {
    const b = points[(i + 1) % points.length];
    const va = transformToViewport(a.x, a.y);
    const vb = transformToViewport(b.x, b.y);
    const mx = (va.x + vb.x) / 2;
    const my = (va.y + vb.y) / 2;
    return { va, vb, mx, my, index: i, id: `edge-${a.id}-${b.id}` };
  });

  const lines = svg.selectAll<SVGLineElement, any>('line.edge-line').data(edgesData, (d: any) => d.id);

  lines
    .enter()
    .append('line')
    .attr('class', 'edge-line')
    .attr('stroke', '#ED6B57')
    .attr('stroke-width', 2)
    .style('vector-effect', 'non-scaling-stroke')
    .attr('stroke-dasharray', '6 4')
    .style('pointer-events', 'none')
    .attr('x1', (d) => d.va.x)
    .attr('y1', (d) => d.va.y)
    .attr('x2', (d) => d.vb.x)
    .attr('y2', (d) => d.vb.y)
    .merge(lines as any)
    .transition(t as any)
    .attr('x1', (d) => d.va.x)
    .attr('y1', (d) => d.va.y)
    .attr('x2', (d) => d.vb.x)
    .attr('y2', (d) => d.vb.y);

  lines.exit().remove();

  // "+" circles (constantes en px)
  const plusCircles = svg.selectAll<SVGCircleElement, any>('circle.plus-circle').data(edgesData, (d: any) => d.id);

  plusCircles
    .enter()
    .append('circle')
    .attr('class', 'plus-circle')
    .attr('r', size(10))
    .attr('fill', '#ED6B57')
    .style('pointer-events', 'none')
    .attr('cx', (d) => d.mx)
    .attr('cy', (d) => d.my)
    .merge(plusCircles as any)
    .transition(t as any)
    .attr('r', size(10))
    .attr('cx', (d) => d.mx)
    .attr('cy', (d) => d.my);

  plusCircles.exit().remove();

  // "+" text (constante en px)
  const plusTexts = svg.selectAll<SVGTextElement, any>('text.plus-text').data(edgesData, (d: any) => d.id);

  plusTexts
    .enter()
    .append('text')
    .attr('class', 'plus-text')
    .attr('text-anchor', 'middle')
    .attr('fill', '#ffffff')
    .style('font-size', `${size(16)}px`)
    .style('pointer-events', 'none')
    .text('+')
    .attr('x', (d) => d.mx)
    .attr('y', (d) => d.my + size(5))
    .merge(plusTexts as any)
    .transition(t as any)
    .style('font-size', `${size(19)}px`)
    .attr('x', (d) => d.mx)
    .attr('y', (d) => d.my + size(5));

  plusTexts.exit().remove();

  // "+" hit rects (constantes en px)
  const plusRects = svg.selectAll<SVGRectElement, any>('rect.plus-rect').data(edgesData, (d: any) => d.id);

  const plusRectsEnter = plusRects
    .enter()
    .append('rect')
    .attr('class', 'plus-rect')
    .attr('width', size(50))
    .attr('height', size(50))
    .attr('fill', 'transparent')
    .style('cursor', 'pointer')
    .style('pointer-events', 'auto')
    .attr('x', (d) => d.mx - size(50) / 2)
    .attr('y', (d) => d.my - size(50) / 2);

  plusRectsEnter
    .merge(plusRects as any)
    .transition(t as any)
    .attr('width', size(50))
    .attr('height', size(50))
    .attr('x', (d) => d.mx - size(50) / 2)
    .attr('y', (d) => d.my - size(50) / 2);

  svg
    .selectAll<SVGRectElement, any>('rect.plus-rect')
    .on('mouseover', function (_event, d: any) {
      d3.select(`circle.plus-circle:nth-of-type(${d.index + 1})`).transition().duration(150).attr('r', size(13));
    })
    .on('mouseout', function (_event, d: any) {
      d3.select(`circle.plus-circle:nth-of-type(${d.index + 1})`).transition().duration(150).attr('r', size(10));
    })
    .on('click', function (event, d: any) {
      event.stopPropagation();
      const imgCoords = transformToImage(d.mx, d.my);
      addPoint(d.index + 1, imgCoords.x, imgCoords.y);
    });

  plusRects.exit().remove();

  // Draggable control points (constantes en px)
  const circles = svg.selectAll<SVGCircleElement, any>('circle.point').data(points, (d: any) => d.id);

  const circlesEnter = circles
    .enter()
    .append('circle')
    .attr('class', 'point')
    .attr('r', size(8))
    .attr('fill', '#ED6B57')
    .style('cursor', 'pointer')
    .style('pointer-events', 'auto')
    .attr('cx', (d) => transformToViewport(d.x, d.y).x)
    .attr('cy', (d) => transformToViewport(d.x, d.y).y);

  circlesEnter
    .merge(circles as any)
    .transition(t as any)
    .attr('r', size(7))
    .attr('cx', (d) => transformToViewport(d.x, d.y).x)
    .attr('cy', (d) => transformToViewport(d.x, d.y).y);

  svg
    .selectAll<SVGCircleElement, any>('circle.point')
    .on('mouseover', function () {
      d3.select(this).transition().duration(150).attr('r', size(11));
    })
    .on('mouseout', function () {
      d3.select(this).transition().duration(150).attr('r', size(8));
    })
    .on('mousedown', function (event, d: any) {
      event.stopPropagation();
      // Usa el id directamente, no el índice
      setDragging(d.id);
    });

  circles.exit().remove();

  svg.selectAll('circle.point').raise();
};