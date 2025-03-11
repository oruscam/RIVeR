import { useEffect, useRef } from 'react'
import './graphs.css'
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks'
import * as d3 from 'd3'
import { drawSvgSectionLine, drawVectors } from './index'
import { Section } from '../../store/section/types'
import { getGlobalMagnitudes } from '../../helpers/drawVectorsFunctions'
interface VelocityVectorProps {
    height: number;
    width: number;
    factor: number | { x: number, y: number };
    isReport?: boolean;
    seeAll: boolean;
    sectionIndex?: number;
}

export const VelocityVector = ({ height, width, factor, isReport = false, seeAll, sectionIndex}: VelocityVectorProps )  => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { video } = useProjectSlice();
    const { sections, activeSection, transformationMatrix } = useSectionSlice()
    const { screenSizes } = useUiSlice()

    const { width: imageWidth, height: imageHeight } = video.data;

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        const svg = d3.select(svgRef.current as SVGSVGElement);
        svg.attr("width", width)
            .attr("height", height)
            .style("background-color", "transparent");
        
        const { max: globalMax, min: globalMin } = getGlobalMagnitudes(sections) 

        sections.forEach((section: Section, index: number) => {
            const { data, interpolated, name, sectionPoints, dirPoints } = section;
            if ( !data ) return;

            if (!seeAll) {

            drawVectors( svg, factor, activeSection, interpolated, data, isReport, transformationMatrix, imageWidth, imageHeight, globalMin, globalMax );
            drawSvgSectionLine({
                svgElement: svgRef.current!,
                factor: factor,
                dirPoints: dirPoints,
                sectionPoints: sectionPoints,
                name: name,
                isReport: isReport,
                imageWidth: screenSizes.imageWidth!,
                imageHeight: screenSizes.imageHeight!
            } )
        
        } else {
            if (isReport && sectionIndex !== index) return;
            if (activeSection === index || isReport) {
                drawVectors( svg, factor, activeSection, interpolated, data, isReport, transformationMatrix, imageWidth, imageHeight, globalMin, globalMax );
                drawSvgSectionLine({
                    svgElement: svgRef.current!,
                    factor: factor,
                    dirPoints: dirPoints,
                    sectionPoints: sectionPoints,
                    name: name,
                    isReport: isReport,
                    imageWidth: screenSizes.imageWidth!,
                    imageHeight: screenSizes.imageHeight!
                } )
            }
            }
        });
    }, [ factor, seeAll, sections, activeSection]);

    return (
        <>
            <svg ref={svgRef} className='svg-in-image-container'/>

        </>
    )
}