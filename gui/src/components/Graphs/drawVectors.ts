import * as d3 from 'd3'
import { COLORS } from "../../constants/constants";

export const drawVectors = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _sections: any[],
    factor: number,
    vectorAmplitudeFactor: number,
    sectionIndex: number,
    interpolated: boolean,
    data: { x: number[], y: number[], streamwise_x: number[], streamwise_y: number[], check: boolean[] },
    isReport: boolean
) => {
    const { x, y, streamwise_x, streamwise_y, check } = data;

    console.log(vectorAmplitudeFactor)

    if (!x || !y || !streamwise_x || !streamwise_y || !check) return;

    const vectors = d3.range(x.length).map(i => {
        if (streamwise_x[i] === null || streamwise_y[i] === null || x[i] === null || y[i] === null) {
            return {
                x0: x[i] / factor,
                y0: y[i] / factor,
                x1: 1,
                y1: 1,
                color: COLORS.TRANSPARENT
            };
        }

        return {
            x0: x[i] / factor,
            y0: y[i] / factor,
            x1: (x[i] / factor + streamwise_x[i] * vectorAmplitudeFactor * 30),
            y1: (y[i] / factor + streamwise_y[i] * vectorAmplitudeFactor * 30),
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
            .attr("refX", 10)
            .attr("refY", 0)
            .attr("markerWidth", isReport ? 4 : 6)
            .attr("markerHeight", isReport ? 4 : 6)
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr('fill', vector.color);
    });
}