import * as d3 from 'd3'
import { factor, importedPoint } from "../../types"
import { COLORS, MARKS } from '../../constants/constants'
import { createPinsBase64 } from './createPinsBase64'

interface ipcamSvgProps {
    factor: factor,
    importedPoints: importedPoint[]
    svgElement: SVGSVGElement,
    width: number,
    height: number,
}

export const ipcamSvg = ({
    factor,
    importedPoints,
    svgElement,
    width,
    height
}: ipcamSvgProps) => {
    const svg = d3.select(svgElement)

    svg.attr("width", width)
        .attr("height", height)
        .style("background-color", "transparent");

    // Create a clip-path
    svg.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    const clippedGroup = svg.append("g")
        .attr("clip-path", "url(#clip)");

    for (let i = 0; i < importedPoints.length; i++) {
        const { ellipse, projectedPoint, x, y, selected } = importedPoints[i]

        if (ellipse && selected) {
            console.log('inside ellipse', ellipse)
            clippedGroup.append('ellipse')
                .attr('cx', (ellipse.center[0]) / factor.x)
                .attr('cy', (ellipse.center[1]) / factor.y)
                .attr('rx', ellipse.width / factor.x)
                .attr('ry', ellipse.height / factor.y)
                .attr('transform', `rotate(${ellipse.angle}, ${(ellipse.center[0]) / factor.x}, ${(ellipse.center[1]) / factor.y})`)
                .attr('fill', COLORS.ELLIPSE.FILL)
                .attr('stroke', COLORS.ELLIPSE.STROKE)
                .attr('stroke-width', 1)
        }

        if (projectedPoint && selected) {
            clippedGroup.append('circle')
                .attr('cx', projectedPoint[0] / factor.x)
                .attr('cy', projectedPoint[1] / factor.y)
                .attr('r', 2)
                .attr('fill', COLORS.RED)

            if ( x && y ){
                clippedGroup.append('line')
                    .attr('x1', x / factor.x)
                    .attr('y1', y / factor.y)
                    .attr('x2', projectedPoint[0] / factor.x)
                    .attr('y2', projectedPoint[1] / factor.y)
                    .attr('stroke', COLORS.RED)
                    .attr('stroke-width', 1)
            }
        }

        if (x && y) {
            const { pinSVGBase64, pinGreySVGBase64 } = createPinsBase64()
            clippedGroup.append('image')
                .attr('x', x / factor.x - MARKS.OFFSET_X_REPORT)
                .attr('y', y / factor.y - MARKS.OFFSET_Y_REPORT)
                .attr('width', MARKS.WIDTH_REPORT)
                .attr('height', MARKS.HEIGHT_REPORT)
                .attr('xlink:href', () => {
                    if ( selected ) {
                        return pinSVGBase64
                    } else {
                        return pinGreySVGBase64
                    }
                })
        }
    }
}