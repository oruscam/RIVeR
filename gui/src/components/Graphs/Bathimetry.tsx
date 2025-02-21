import { useEffect, useRef } from 'react';
import { useSectionSlice, useUiSlice } from '../../hooks';
import { bathimetrySvg } from './bathimetrySvg';
import * as d3 from 'd3';
import { GRAPHS } from '../../constants/constants';

interface BathimetryProps {
    showLeftBank: boolean;
    width?: number;
    height?: number;
    drawGrid?: boolean;
}

export const Bathimetry = ({ showLeftBank, height = 340 }: BathimetryProps) => {
    const { sections, activeSection } = useSectionSlice()
    const { screenSizes } = useUiSlice(); 
    const { width: screenWidth } = screenSizes;
    const { bathimetry, name } = sections[activeSection];
    const { x1Intersection, leftBank, level, line, path, x2Intersection } = bathimetry;
    const { rwLength } = sections[activeSection].pixelSize;

    const svgRef = useRef<SVGSVGElement>(null);
    
    const graphWidth = screenWidth * GRAPHS.WIDTH_PROPORTION > GRAPHS.MIN_WIDTH ? screenWidth * GRAPHS.WIDTH_PROPORTION : GRAPHS.MIN_WIDTH;
    
    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if ( line ) {
            if (svgRef.current) {
                bathimetrySvg({
                    svgElement: svgRef.current,
                    data: line,
                    level,
                    showLeftBank,
                    leftBank: (x1Intersection ?? 0) + (leftBank ?? 0),
                    rightBank: (x1Intersection ?? 0) + (leftBank ?? 0) + rwLength,
                    x1Intersection: x1Intersection ?? 0,
                    x2Intersection: x2Intersection ?? 0 + rwLength,
                });
            }
        }
    }, [path, level, leftBank, rwLength, screenWidth])

    return (
        <div className={`${path === '' ? 'hidden' : ''} mb-3`}>
            <svg ref={svgRef} width={graphWidth} height={height} id={`only-section-${name}`}/>
        </div>
    );
};