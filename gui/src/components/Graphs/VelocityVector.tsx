import { useEffect, useRef } from 'react'
import './graphs.css'
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks'
import * as d3 from 'd3'
import { SvgSectionLine } from '../SvgSectionLine'
import { drawVectors } from './index'
import { Section } from '../../store/section/types'

interface VelocityVectorProps {
    section: Section,
    sectionIndex: number,
    height: number;
    width: number;
    factor: number | { x: number, y: number };
    isReport?: boolean;
    index?: number;
    transformationMatrix: any
}

export const VelocityVector = ({ section, sectionIndex, transformationMatrix, height, width, factor, isReport = false, index }: VelocityVectorProps )  => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { video } = useProjectSlice();
    const { seeAll } = useUiSlice();
    const { data, artificialSeeding, interpolated } = section;

    const { height: videoHeight } = video.data;

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        const svg = d3.select(svgRef.current as SVGSVGElement);
        svg.attr("width", width)
            .attr("height", height)
            .style("background-color", "transparent");

        if (!isReport) {
            if (!data) return;

            drawVectors(svg, factor, sectionIndex, interpolated, artificialSeeding, data, isReport, transformationMatrix, videoHeight);
        } else {
            if (index !== undefined) {
                if (!data) return;

                console.log('section name', section.name)
                drawVectors(svg, factor, index, interpolated, artificialSeeding, data, isReport, transformationMatrix, videoHeight);
            }
        }
    }, [ factor, interpolated, artificialSeeding, seeAll, data ]);

    const drawSvgSectionLine = () => {
        return <SvgSectionLine key={sectionIndex} factor={factor} index={sectionIndex} isReport={isReport}/>
    }

    return (
        <>
            {/* <img src={firstFramePath} width={width} height={height} className={isReport ? 'image-border-radius' : ''}/> */}
            <svg ref={svgRef} className='svg-in-image-container' />
            {
                drawSvgSectionLine()
            }
        </>
    )
}