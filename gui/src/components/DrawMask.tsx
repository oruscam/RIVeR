import { useEffect, useRef, useState } from "react";
import * as d3 from 'd3';
import { useProjectSlice } from "../hooks";

export const DrawMask = ({ width, height, factor }: { width: number; height: number; factor: number }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { data, parameters } = useProjectSlice().video
  const imageWidth = data.width * parameters.factor;
  const imageHeight = data.height * parameters.factor;

  const [points, setPoints] = useState([
    { x: imageWidth / 2, y: imageHeight / 2 - imageHeight * 0.1},
    { x: imageWidth / 2 - imageWidth * 0.075, y: imageHeight / 2 + imageHeight * 0.1},
    { x:  imageWidth / 2 + imageWidth * 0.075, y: imageHeight / 2 + imageHeight * 0.1},
  ]);
  const [dragging, setDragging] = useState<number|null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ========================
    // Create fill pattern
    // ========================
    const defs = svg.append('defs');
    const pattern = defs.append('pattern')
      .attr('id', 'dashFill')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 10)
      .attr('height', 10);

    pattern.append('path')
      .attr('d', 'M0 10 L10 0')
      .attr('stroke', '#ED6B57')
      .attr('stroke-width', 1);

    // ========================
    // Draw polygon
    // ========================
    svg.append('polygon')
      .attr('points', points.map(p => `${p.x / factor},${p.y / factor}`).join(' '))
      .attr('fill', 'url(#dashFill)')
      .attr('stroke', 'none');

    // ========================
    // Draw edges and "+" controls
    // ========================
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length];

      // Draw dashed edge
      svg.append('line')
        .attr('x1', a.x / factor)
        .attr('y1', a.y / factor)
        .attr('x2', b.x / factor)
        .attr('y2', b.y / factor)
        .attr('stroke', '#ED6B57')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '6 4');

      // Midpoint coordinates
      const mx = (a.x / factor + b.x / factor) / 2;
      const my = (a.y / factor + b.y / factor) / 2;

      // Plus circle (visual only)
      const plusCircle = svg.append('circle')
        .attr('cx', mx)
        .attr('cy', my)
        .attr('r', 12)
        .attr('fill', '#ED6B57')
        .style('pointer-events', 'none');

      // Plus text
      svg.append('text')
        .attr('x', mx)
        .attr('y', my + 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '20px')
        .style('pointer-events', 'none')
        .text('+');

      // Invisible hit area for interaction
      svg.append('rect')
        .attr('x', mx - 25)
        .attr('y', my - 25)
        .attr('width', 50)
        .attr('height', 50)
        .attr('fill', 'transparent')
        .style('cursor', 'pointer')
        .on('mouseover', () => {
          plusCircle
            .transition()
            .duration(150)
            .attr('r', 15);
        })
        .on('mouseout', () => {
          plusCircle
            .transition()
            .duration(150)
            .attr('r', 12);
        })
        .on('click', () => addPoint(i + 1, mx, my));
    });

    // ========================
    // Draw draggable vertices
    // ========================
    svg.selectAll('.point')
      .data(points)
      .enter()
      .append('circle')
      .attr('class', 'point')
      .attr('cx', d => d.x / factor)
      .attr('cy', d => d.y / factor)
      .attr('r', 8)
      .attr('fill', '#ED6B57')
      .style('cursor', 'pointer')
      .on('mouseover', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', 9);
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', 8);
      })
      .on('mousedown', (event, d) => {
        const index = points.indexOf(d);
        setDragging(index);
      });

  }, [points, factor]);


  // Add a new point at midpoint
  const addPoint = (index: number, x: number, y: number) => {
    const newPoints = [...points];
    newPoints.splice(index, 0, { x: x * factor, y : y * factor });

    setPoints(newPoints);
  };

  // Handle mouse move for dragging
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (dragging !== null) {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect()
      
      // Coordenadas relativas al SVG
      const svgX = event.clientX - rect.left;
      const svgY = event.clientY - rect.top;
      
      const newPoints = [...points];
      newPoints[dragging] = { 
        x: svgX * factor, 
        y: svgY * factor 
      };
      setPoints(newPoints);
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    setDragging(null);
    
  };

  return (
      <svg
        ref={svgRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="draw-mask"
      />
  );
}