import * as d3 from 'd3';
import { QuiverData } from '../../helpers/drawVectorsFunctions';
import { VECTORS } from '../../constants/constants';

export const drawQuiver = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    data: QuiverData[],
    factor: number
) => {
    const defs = svg.append('defs');
    data.forEach((d, i) => {
        defs.append('marker')
            .attr('id', `arrow-${i}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 1)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto-start-reverse')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', d.color)
            .attr('z-index', 15)

    });

    // Tooltip div
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> = d3.select<HTMLDivElement, unknown>('#quiver-tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select<HTMLDivElement, unknown>('body')
            .append('div')
            .attr('id', 'quiver-tooltip')
            .style('position', () => 'absolute')
            .style('top', () => '0px')
            .style('background', () => 'white')
            .style('border', () => '1px solid #ccc')
            .style('padding', () => '5px 10px')
            .style('border-radius', () => '5px')
            .style('pointer-events', () => 'none')
            .style('opacity', () => '0');
    } else {
        // Reuse existing tooltip (reset opacity/position if needed)
        tooltip.style('opacity', () => '0').style('top', () => '0px');
    }

    // 🔹 Líneas de los vectores
    svg.selectAll('line')
        .data(data)
        .enter()
        .append('line')
        .attr('x1', (d) => d.x / factor)
        .attr('y1', (d) => d.y / factor)
        .attr('x2', (d) => d.x / factor + (d.u * VECTORS.VELOCITY_AMPLITUDE_FACTOR) / factor)
        .attr('y2', (d) => d.y / factor + (d.v * VECTORS.VELOCITY_AMPLITUDE_FACTOR) / factor)
        .attr('stroke', (d) => d.color)
        .attr('stroke-width', 2.3)
        .attr('marker-end', (_d, i) => `url(#arrow-${i})`);

    // 🔹 Área de interacción más grande (círculo invisible en la punta)
    const hitboxRadius = 12; // 👈 ajusta el tamaño del área

    svg.selectAll('circle.hitbox')
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'hitbox')
        .attr('cx', (d) => d.x / factor + (d.u * VECTORS.VELOCITY_AMPLITUDE_FACTOR) / factor)
        .attr('cy', (d) => d.y / factor + (d.v * VECTORS.VELOCITY_AMPLITUDE_FACTOR) / factor)
        .attr('r', hitboxRadius)
        .style('fill', () => 'transparent')
        .style('cursor', () => 'pointer')
        .on("mouseover", function (event: MouseEvent, d: QuiverData) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`${d.velocity.toFixed(2)}`)
                .style("left", () => (event.pageX + 10) + "px")
                .style("top", () => (event.pageY - 28) + "px")
                .style('background', () => 'rgba(255, 255, 255, 0.4)')
                .style('color', () => d.color)
                .style("z-index", () => "1000");
        })
        .on("mousemove", function (event: MouseEvent) {
            tooltip.style("left", () => (event.pageX + 10) + "px")
                   .style("top", () => (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            tooltip.transition().duration(300).style("opacity", 0);
        });
};
