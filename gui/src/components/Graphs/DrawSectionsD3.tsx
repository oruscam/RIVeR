import { useEffect, useRef } from "react"
import * as d3 from 'd3';
import { useSectionSlice } from "../../hooks";
import { drawSvgSectionLine } from "./drawSvgSectionLine";

export const DrawSectionsD3 = ({ width, height, factor }: { width: number; height: number, factor: number}) => {
    const svgRef = useRef<SVGSVGElement>(null);
        
    const { sections } = useSectionSlice() 
    
    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove();
        const svg = d3.select(svgRef.current as SVGSVGElement);
        svg.attr('width', width).attr('height', height).style('background-color', 'transparent');

        sections.forEach((section) => {
            const { dirPoints, sectionPoints, name} = section
            drawSvgSectionLine({
                svgElement: svgRef.current!,
                factor: factor,
                dirPoints: dirPoints,
                sectionPoints: sectionPoints,
                name: name,
                isReport: false,
                imageWidth: width,
                imageHeight: height,
                isProcessing: true
            })
        })
        
    }, [])

    return (
        <svg ref={svgRef} className="svg-in-image-container"/>
    )
}