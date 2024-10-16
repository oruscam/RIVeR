import { useEffect, useRef } from 'react'
import './graphs.css'
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks'
import { DrawSections } from '../DrawSections'
import { Layer, Stage } from 'react-konva'
import * as d3 from 'd3'
import { BLUE, RED, TRANSPARENT, VECTOR_AMPLITUDE_FACTOR} from '../../constants/constants'

interface VelocityVectorProps {
    height: number;
    width: number;
    factor: number;
    vectorAmplitudeFactor?: number;
    isReport?: boolean;
    index?: number;
}

const drawVectors = (
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

export const VelocityVector = ({ height, width, factor, vectorAmplitudeFactor = VECTOR_AMPLITUDE_FACTOR, isReport = false, index }: VelocityVectorProps )  => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { sections, activeSection } = useSectionSlice();
    const { firstFramePath } = useProjectSlice();
    const { seeAll } = useUiSlice();
    
    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        const svg = d3.select(svgRef.current);
        svg.attr("width", width)
            .attr("height", height)
            .style("background-color", "transparent");

        if (!isReport) {
            sections.forEach((section, sectionIndex) => {
                if (sectionIndex === 0) return;
                if (seeAll && activeSection !== sectionIndex) return;

                const { data, interpolated } = section;
                if (!data) return;

                drawVectors(svg, sections, factor, vectorAmplitudeFactor, sectionIndex, interpolated, data, isReport);
            });
        } else {
            if (index !== undefined) {
                const { data, interpolated } = sections[index];
                if (!data) return;

                drawVectors(svg, sections, factor, vectorAmplitudeFactor, index, interpolated, data, isReport);
            }
        }
    }, [factor, sections, activeSection, seeAll]);

    return (
        <div id="velocity-vector-container" style={{ width: width, height: height }}>
            <img src={'/@fs' + firstFramePath} width={width} height={height} style={isReport ? { borderRadius: '20px' } : {}}></img>
            <Stage className='konva-data-container' width={width} height={height}>
              <Layer>
                <DrawSections factor={factor} draggable={false} drawPins={true}/>
              </Layer>
            </Stage>
            <svg ref={svgRef} id='velocity-vector'></svg>
        </div>
    )
}