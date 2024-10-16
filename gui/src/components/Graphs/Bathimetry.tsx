import { useEffect, useRef } from 'react';
import { useSectionSlice, useUiSlice } from '../../hooks';
import getBathimetryLimits from '../../helpers/getBathimetryLimits';
import { bathimetrySvg } from './bathimetrySvg';
import * as d3 from 'd3';
import { GRAPH_WIDTH_PROPORTION, MIN_GRAPH_WIDTH } from '../../constants/constants';

interface BathimetryProps {
    setBathimetryLimits?: (limits: { min: number, max: number }) => void;
    bathimetryLimits?: { min: number, max: number };
    leftBank?: number;
    showLeftBank: boolean;
    width?: number;
    height?: number;
    drawGrid?: boolean;
}

export const Bathimetry = ({ setBathimetryLimits, bathimetryLimits, leftBank, showLeftBank, height = 320, drawGrid = true }: BathimetryProps) => {
    const { sections, activeSection, onUpdateSection } = useSectionSlice()
    const { onSetErrorMessage, screenSizes } = useUiSlice(); 
    const { width: screenWidth } = screenSizes;
    const { level, path, line } = sections[activeSection].bathimetry;
    const {rw_length} = sections[activeSection].pixelSize;

    const svgRef = useRef<SVGSVGElement>(null);
    
    const graphWidth = screenWidth * GRAPH_WIDTH_PROPORTION > MIN_GRAPH_WIDTH ? screenWidth * GRAPH_WIDTH_PROPORTION : MIN_GRAPH_WIDTH;

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if ( line ) {
            if(setBathimetryLimits && bathimetryLimits?.max === bathimetryLimits?.min){ 
                const { max, min } = getBathimetryLimits(line);
                setBathimetryLimits({ min, max });
            }
            if (svgRef.current) {
                const { intersectionX, error  } = bathimetrySvg({
                    svgElement: svgRef.current,
                    data: line,
                    level,
                    showLeftBank,
                    drawGrid,
                    leftBank,
                    rightBank: rw_length,
                    
                });

                if( intersectionX ){
                    onUpdateSection({ leftBank: intersectionX });
                }   
                if ( error ){
                    onSetErrorMessage({error});
                }
            }
        }
    }, [path, line, level, leftBank, rw_length, screenWidth])

    return (
        <div className={`${path === '' ? 'hidden' : ''}`}>
            <svg ref={svgRef} id="bathimetry" width={graphWidth} height={height}></svg>
        </div>
    );
};