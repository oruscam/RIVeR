import * as d3 from 'd3'
import { BLUE, RED, TRANSPARENT } from "../../constants/constants";

export const drawVectors = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _sections: any[],
    factor: number,
    vectorAmplitudeFactor: number,
    sectionIndex: number,
    interpolated: boolean,
    data: { x: number[], y: number[], displacement_x_streamwise: number[], displacement_y_streamwise: number[], check: boolean[] },
    isReport: boolean
) => {
    const { x, y, displacement_x_streamwise, displacement_y_streamwise, check } = data;

    console.log(vectorAmplitudeFactor)

    if (!x || !y || !displacement_x_streamwise || !displacement_y_streamwise || !check) return;

    const vectors = d3.range(x.length).map(i => {
        if (displacement_x_streamwise[i] === null || displacement_y_streamwise[i] === null || x[i] === null || y[i] === null) {
            return {
                x0: x[i] / factor,
                y0: y[i] / factor,
                x1: 1,
                y1: 1,
                color: TRANSPARENT
            };
        }

        return {
            x0: x[i] / factor,
            y0: y[i] / factor,
            x1: (x[i] / factor + displacement_x_streamwise[i] * vectorAmplitudeFactor),
            y1: (y[i] / factor - displacement_y_streamwise[i] * vectorAmplitudeFactor),
            color: check[i] ? BLUE : interpolated ? RED : TRANSPARENT
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