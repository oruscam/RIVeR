import { useEffect, useRef } from 'react';
import { useSectionSlice, useUiSlice } from '../../hooks';
import { bathimetrySvg } from './bathimetrySvg';
import * as d3 from 'd3';
import { GRAPH_WIDTH_PROPORTION, MIN_GRAPH_WIDTH } from '../../constants/constants';

interface BathimetryProps {
    showLeftBank: boolean;
    width?: number;
    height?: number;
    drawGrid?: boolean;
}

export const Bathimetry = ({ showLeftBank, height = 320, drawGrid = true }: BathimetryProps) => {
    const { sections, activeSection } = useSectionSlice()
    const { screenSizes } = useUiSlice(); 
    const { width: screenWidth } = screenSizes;
    const { level, path, line, leftBank, x1Intersection } = sections[activeSection].bathimetry;
    const {rw_length} = sections[activeSection].pixelSize;

    const svgRef = useRef<SVGSVGElement>(null);
    
    const graphWidth = screenWidth * GRAPH_WIDTH_PROPORTION > MIN_GRAPH_WIDTH ? screenWidth * GRAPH_WIDTH_PROPORTION : MIN_GRAPH_WIDTH;

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if ( line ) {
            if (svgRef.current) {
                bathimetrySvg({
                    svgElement: svgRef.current,
                    data: line,
                    level,
                    showLeftBank,
                    drawGrid,
                    leftBank: (x1Intersection ?? 0) + (leftBank ?? 0),
                    rightBank: (x1Intersection ?? 0) + (leftBank ?? 0) + rw_length,
                });
            }
        }
    }, [path, level, leftBank, rw_length, screenWidth])

    return (
        <div className={`${path === '' ? 'hidden' : ''}`}>
            <svg ref={svgRef} id="bathimetry" width={graphWidth} height={height}></svg>
        </div>
    );
};