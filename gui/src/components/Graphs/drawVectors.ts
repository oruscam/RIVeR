import * as d3 from 'd3'
import { COLORS, VECTORS } from "../../constants/constants";
import { calculateArrowWidth, calculateMultipleArrows } from '../../helpers';
import { SectionData } from '../../store/section/types';

export const drawVectors = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _sections: any[],
    factor: number | { x: number, y: number },
    sectionIndex: number,
    interpolated: boolean,
    data: SectionData,
    isReport: boolean,
    transformationMatrix: number[][],
    videoHeight: number
) => {

    // Data for drawing the vectors
    const { east, north, streamwise_velocity_magnitude, distance, check, filled_streamwise_velocity_magnitude } = data

    if ( !east || !north || !streamwise_velocity_magnitude || !distance ) return;

    const magnitude = streamwise_velocity_magnitude.map((d, i) => {
        if ( filled_streamwise_velocity_magnitude !== undefined && check[i] === false ){
            return filled_streamwise_velocity_magnitude[i]
        } else if ( interpolated === false && check[i] === false ){
            return null
        } else {
            if ( d === null ) return 0
            return d
        }
    })

    const arrowWidth = calculateArrowWidth(distance)
    const arrows = calculateMultipleArrows( east, north, magnitude, transformationMatrix, videoHeight, arrowWidth )

    arrows.forEach((arrow, i) => {

        if ( check[i] === false && interpolated === false ) return null;

        // Crear el polígono para la flecha
        if ('points' in arrow && 'color' in arrow) {
            const polygonPoints = arrow.points.map((point: number[]) => `${point[0] / (typeof factor === 'number' ? factor : factor.x)},${point[1] / (typeof factor === 'number' ? factor : factor.y)}`).join(" ");
        
            svg.append("polygon")
                .attr("points", polygonPoints)
                .attr("fill", arrow.color)
                .attr("fill-opacity", 0.7)
                .attr("stroke", arrow.color)
                .attr("stroke-width", 1.5)
                .attr("stroke-width", 1.5)
                .classed(`section-${sectionIndex}`, true);
        }
    });
}