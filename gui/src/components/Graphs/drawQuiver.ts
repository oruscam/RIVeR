import * as d3 from 'd3';
import { QuiverData } from '../../helpers/drawVectorsFunctions';
import { VECTORS } from '../../constants/constants';

export const drawQuiver = (
    svgRef: React.RefObject<SVGSVGElement>,
    data: QuiverData[],
    width: number,
    height: number,
    factor: number
) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); 

    svg.attr('width', width).attr('height', height).style('background-color', 'transparent');

    const mean_u = d3.mean(data, (d) => Math.abs(d.u)) || 0;
    const mean_v = d3.mean(data, (d) => Math.abs(d.v)) || 0;

    const defs = svg.append('defs');
    data.forEach((d, i) => {
        defs
        .append('marker')
        .attr('id', `arrow-${i}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 1)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', d.color);
    });

    svg
        .selectAll('line')
        .data(data)
        .enter()
        .append('line')
        .attr('x1', (d) => d.x / factor)
        .attr('y1', (d) => d.y / factor)
        .attr('x2', (d) => d.x / factor + (d.u * Math.abs(mean_u - VECTORS.QUIVER_AMPLITUDE_FACTOR)) / factor)
        .attr('y2', (d) => d.y / factor + (d.v * Math.abs(mean_v - VECTORS.QUIVER_AMPLITUDE_FACTOR)) / factor)
        .attr('stroke', (d) => d.color)
        .attr('stroke-width', 2.3)
        .attr('marker-end', (_d, i) => `url(#arrow-${i})`)
}