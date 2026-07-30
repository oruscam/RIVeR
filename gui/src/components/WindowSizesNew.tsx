import { useEffect, useRef } from 'react';
import { useDataSlice, useUiSlice } from '../hooks';
import * as d3 from 'd3';

export const WindowSizesNew = ({ width, height }: { width: number; height: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { processing } = useDataSlice();
  const { step1 } = processing.form;
  const { screenSizes } = useUiSlice();
  const { factor } = screenSizes;

  useEffect(() => {
    if (!svgRef.current) return;

    const size = step1 / factor!;
    const xCenter = width / 2;
    const yCenter = height / 2;

    // Limpiar el SVG antes de redibujar
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Crear el grupo
    const group = svg.append('g');

    // Rectángulo exterior (azul)
    group
      .append('rect')
      .attr('x', xCenter - size / 2)
      .attr('y', yCenter - size / 2)
      .attr('width', size)
      .attr('height', size)
      .attr('stroke', '#6CD4FF')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '5,3')
      .attr('fill', 'none');

    // Rectángulo interior (naranja)
    group
      .append('rect')
      .attr('x', xCenter - size / 4)
      .attr('y', yCenter - size / 4)
      .attr('width', size / 2)
      .attr('height', size / 2)
      .attr('stroke', '#F5BF61')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '5,3')
      .attr('fill', 'none');
  }, [width, height, step1, factor]);

  return <svg ref={svgRef} width={width} height={height} className="window-size" />;
};
