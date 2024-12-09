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

export const Bathimetry = ({ showLeftBank, height = 320 }: BathimetryProps) => {
    const { sections, activeSection } = useSectionSlice()
    const { screenSizes } = useUiSlice(); 
    const { width: screenWidth } = screenSizes;
    const { bathimetry, name } = sections[activeSection];
    const { x1Intersection, leftBank, level, line, path, x2Intersection } = bathimetry;
    const {rw_length} = sections[activeSection].pixelSize;

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
                    rightBank: (x1Intersection ?? 0) + (leftBank ?? 0) + rw_length,
                    x1Intersection: x1Intersection ?? 0,
                    x2Intersection: x2Intersection ?? 0 + rw_length,
                });
            }
        }
    }, [path, level, leftBank, rw_length, screenWidth])

    return (
        <div className={`${path === '' ? 'hidden' : ''}`}>
            <svg ref={svgRef} width={graphWidth} height={height} id={`only-section-${name}`}/>
        </div>
    );
};