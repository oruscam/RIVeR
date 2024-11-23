import * as d3 from 'd3'
import { COLORS, VECTORS } from "../../constants/constants";

export const drawVectors = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _sections: any[],
    factor: number | { x: number, y: number },
    sectionIndex: number,
    interpolated: boolean,
    data: { x: number[], y: number[], streamwise_x: number[], streamwise_y: number[], check: boolean[] },
    isReport: boolean
) => {
    const { x, y, streamwise_x, streamwise_y, check } = data;

    if (!x || !y || !streamwise_x || !streamwise_y || !check) return;


    const vectors = d3.range(x.length).map(i => {
        if (streamwise_x[i] === null || streamwise_y[i] === (null) || x[i] === null || y[i] === null) {
            return {
                x0: x[i] / (typeof factor === 'number' ? factor : factor.x),
                y0: y[i] / (typeof factor === 'number' ? factor : factor.y),
                x1: x[i] / (typeof factor === 'number' ? factor : factor.x),
                y1: y[i] / (typeof factor === 'number' ? factor : factor.y),
                color: COLORS.TRANSPARENT
            };
        }

        return {
            x0: x[i] / (typeof factor === 'number' ? factor : factor.x),
            y0: y[i] / (typeof factor === 'number' ? factor : factor.y),
            x1: (x[i] / (typeof factor === 'number' ? factor : factor.x) + streamwise_x[i] * VECTORS.VELOCITY_AMPLITUDE_FACTOR / (typeof factor === 'number' ? factor : factor.x)),
            y1: (y[i] / (typeof factor === 'number' ? factor : factor.y) + streamwise_y[i] * VECTORS.VELOCITY_AMPLITUDE_FACTOR / (typeof factor === 'number' ? factor : factor.y)),
            color: check[i] ? COLORS.BLUE : interpolated ? COLORS.RED : COLORS.TRANSPARENT
        };
    });

    svg.selectAll(`line.section-${sectionIndex}`)
        .data(vectors)
        .enter()
        .append('line')
        .attr('x1', d => d.x0)
        .attr('y1', d => d.y0)
        .attr('x2', d => d.x1)
        .attr('y2', d => d.y1)
        .attr('stroke', d => d.color)
        .attr('stroke-width', isReport ? 2 : 2.8)
        .attr('marker-end', (_d, i) => `url(#arrow-${sectionIndex}-${i})`);

    vectors.forEach((vector, index) => {
        svg.append("defs").append("marker")
            .attr("id", `arrow-${sectionIndex}-${index}`)
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 0)
            .attr("refY", 0)
            .attr("markerWidth", isReport ? 4 : 6)
            .attr("markerHeight", isReport ? 4 : 6)
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr('fill', vector.color);
    });

    // vectors.forEach((vector, index) => {
    //     svg.append("defs").append("marker")
    //         .attr("id", `arrow-${sectionIndex}-${index}`)
    //         .attr("viewBox", "0 -5 10 10")
    //         .attr("refX", 2.5) // Ajusta refX para que el punto de referencia esté en el centro de la parte inferior
    //         .attr("refY", 0) // Ajusta refY para que el punto de referencia esté en el centro vertical
    //         .attr("markerWidth", isReport ? 4 : 6)
    //         .attr("markerHeight", isReport ? 4 : 6)
    //         .attr("orient", "auto-start-reverse")
    //         .append("path")
    //         .attr("d", "M0,-5L10,0L0,5L2.5,0Z") // Nuevo estilo de flecha
    //         .attr('fill', vector.color);
    // });
    // vectors.forEach((vector, index) => {
    //     svg.append("defs").append("marker")
    //         .attr("id", `arrow-${sectionIndex}-${index}`)
    //         .attr("viewBox", "0 -5 10 10")
    //         .attr("refX", 2.5) // Ajusta refX para que el punto de referencia esté en el centro de la parte inferior
    //         .attr("refY", 0) // Ajusta refY para que el punto de referencia esté en el centro vertical
    //         .attr("markerWidth", isReport ? 4 : 6)
    //         .attr("markerHeight", isReport ? 4 : 6)
    //         .attr("orient", "auto-start-reverse")
    //         .append("path")
    //         .attr("d", "M0,-5L10,0L0,5L2.5,0Z") // Nuevo estilo de flecha
    //         .attr('fill', vector.color)
    //         .attr('stroke', vector.color); // Añadir contorno del mismo color
    // });
}