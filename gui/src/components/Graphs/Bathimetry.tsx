import { useEffect, useRef } from 'react';
import { useSectionSlice, useUiSlice } from '../../hooks';
import getBathimetryLimits from '../../helpers/getBathimetryLimits';
import { createBathymetryChart } from './bathimetrySvg';
import * as d3 from 'd3';

interface BathimetryProps {
    setBathimetryLimits?: (limits: { min: number, max: number }) => void;
    bathimetryLimits?: { min: number, max: number };
    lineColor: string;
    leftBank?: number;
    showLeftBank: boolean;
    width?: number;
    height?: number;
    drawGrid?: boolean;
}

export const Bathimetry = ({ setBathimetryLimits, bathimetryLimits, leftBank, showLeftBank, width = 500, height = 320, drawGrid = true }: BathimetryProps) => {
    const { sections, activeSection, onUpdateSection } = useSectionSlice()
    const { onSetErrorMessage } = useUiSlice(); 
    const { level, path, line } = sections[activeSection].bathimetry;
    const {rw_length} = sections[activeSection].pixelSize;
    const svgRef = useRef<SVGSVGElement>(null);
    

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if ( line ) {
            if(setBathimetryLimits && bathimetryLimits?.max === bathimetryLimits?.min){ 
                const { max, min } = getBathimetryLimits(line);
                setBathimetryLimits({ min, max });
            }
            if (svgRef.current) {
                const { intersectionX, error  } = createBathymetryChart({
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
                if ( error !== '' ){
                    onSetErrorMessage({error});
                }
            }
        }
    }, [path, line, level, leftBank, rw_length])

    return (
        <div className={`${path === '' ? 'hidden' : ''}`}>
            <svg ref={svgRef} id="bathimetry" width={width} height={height}></svg>
        </div>
    );
};