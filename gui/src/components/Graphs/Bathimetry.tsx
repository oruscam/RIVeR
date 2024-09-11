import { useEffect, useMemo, useRef } from 'react';
import { useSectionSlice, useUiSlice } from '../../hooks';
import getBathimetryLimits from '../../helpers/getBathimetryLimits';
import bathParser from '../../helpers/bathimetryParser';
import { createBathymetryChart } from './bathimetrySvg';
import * as d3 from 'd3';

interface BathimetryProps {
    setBathimetryLimits?: (limits: { min: number, max: number }) => void;
    lineColor: string;
    leftBank?: number;
    showLeftBank: boolean;
    width?: number;
    height?: number;
    drawGrid?: boolean;
}

export const Bathimetry = ({ setBathimetryLimits, lineColor, leftBank, showLeftBank, width = 450, height = 250, drawGrid = true }: BathimetryProps) => {
    const { sections, activeSection, onUpdateSection } = useSectionSlice()
    const { onSetErrorMessage } = useUiSlice(); 
    const { blob, level, path } = sections[activeSection].bathimetry;
    const svgRef = useRef<SVGSVGElement>(null);
    

    const data = useMemo(() => {
        if(path !== '' || blob !== ''){
            return bathParser(blob ? blob : path, 'csv')
        }
        return null
    }, [path, blob]);



    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if ( data ) {
            data.then(data => {
                if(setBathimetryLimits){
                    const { max, min } = getBathimetryLimits(data || []);
                    setBathimetryLimits({ min, max });
                }
                if (svgRef.current) {
                    const { intersectionX, error  } = createBathymetryChart(svgRef.current, data, level, lineColor, showLeftBank, drawGrid, leftBank);
    
                    if( intersectionX ){
                        onUpdateSection({ leftBank: intersectionX });
                    }   
                    if ( error !== '' ){
                        onSetErrorMessage({error});
                    }
                }

            })
        }
    }, [data, level, leftBank])

    return (
        <div className={`graph-container ${path === '' && blob === '' ? 'hidden' : ''}`}>
            <svg ref={svgRef} id="bathimetry" width={width} height={height}></svg>
        </div>
    );
};