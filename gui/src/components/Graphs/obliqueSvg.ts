import { factor, Point } from "../../types";
import * as d3 from 'd3'
import { COLORS, MARKS } from "../../constants/constants";
import { createPinsBase64 } from "./createPinsBase64";

interface obliqueSvgProps {
    factor: factor,
    coordinates: Point[],
    distances: {
        d12: number,
        d23: number,
        d34: number,
        d41: number,
        d13: number,
        d24: number,
    },
    svgElement: SVGSVGElement,
    width: number,
    height: number,
}

export const obliqueSvg = ({
    factor,
    coordinates,
    distances,
    svgElement,
    width,
    height
}: obliqueSvgProps) => {
    const svg = d3.select(svgElement)

    svg.attr("width", width)
        .attr("height", height)
        .style("background-color", "transparent");

    const { pinRedSVGBase64, pinSVGBase64 } = createPinsBase64();


    // Add lines between points
    for (let i = 0; i < coordinates.length - 1; i++) {
        svg.append('line')
            .attr('x1', coordinates[i].x / factor.x)
            .attr('y1', coordinates[i].y / factor.y)
            .attr('x2', coordinates[i + 1].x / factor.x)
            .attr('y2', coordinates[i + 1].y / factor.y)
            .attr('stroke', (() => {
                switch (i) {
                    case 0:
                        return COLORS.CONTROL_POINTS.D12
                        break
                    
                    case 1:
                        return COLORS.CONTROL_POINTS.D23
                        break

                    case 2:
                        return COLORS.CONTROL_POINTS.D34
                        break
                    
                    default:
                        return COLORS.BLACK
                }
            }))
            .attr('stroke-width', 2);
    }

    if (coordinates.length > 1) {
        svg.append('line')
            .attr('x1', coordinates[coordinates.length - 1].x / factor.x)
            .attr('y1', coordinates[coordinates.length - 1].y / factor.y)
            .attr('x2', coordinates[0].x / factor.x)
            .attr('y2', coordinates[0].y / factor.y)
            .attr('stroke', COLORS.CONTROL_POINTS.D14)
            .attr('stroke-width', 2);

        svg.append('line')
            .attr('x1', coordinates[0].x / factor.x)
            .attr('y1', coordinates[0].y / factor.y)
            .attr('x2', coordinates[2].x / factor.x)
            .attr('y2', coordinates[2].y / factor.y)
            .attr('stroke', COLORS.CONTROL_POINTS.D13)
            .attr('stroke-width', 2);

        svg.append('line')
            .attr('x1', coordinates[1].x / factor.x)
            .attr('y1', coordinates[1].y / factor.y)
            .attr('x2', coordinates[3].x / factor.x)
            .attr('y2', coordinates[3].y / factor.y)
            .attr('stroke', COLORS.CONTROL_POINTS.D24)
            .attr('stroke-width', 2);
    }

    svg.selectAll('image')
        .data(coordinates)
        .enter()
        .append('image')
        .attr('x', (d) => d.x / factor.x - MARKS.OFFSET_X_REPORT) // Adjusting for image width
        .attr('y', (d) => d.y / factor.y - MARKS.OFFSET_Y_REPORT) // Adjusting for image height
        .attr('width', MARKS.WIDTH_REPORT)
        .attr('height', MARKS.HEIGHT_REPORT)
        .attr('xlink:href', (_d, i: number) => {
            if (i === 0) return pinRedSVGBase64;
            return pinSVGBase64;
        });
}