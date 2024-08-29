import { useEffect, useRef } from 'react';
import { useSectionSlice } from '../../hooks';
import getBathimetryLimits from '../../helpers/getBathimetryLimits';
import bathParser from '../../helpers/bathimetryParser';
import { createBathymetryChart } from './bathimetrySvg';
import * as d3 from 'd3';

interface BathimetryProps {
    setBathimetryLimits?: (limits: { min: number, max: number }) => void;
    lineColor: string;
}

export const Bathimetry = ({ setBathimetryLimits, lineColor }: BathimetryProps) => {
    const { sections, activeSection } = useSectionSlice()
    const { blob, level, path } = sections[activeSection].bathimetry;
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if(path !== '' || blob !== ''){
            bathParser(blob ? blob : path, 'csv').then(data => {
                if( data ){
                    if(setBathimetryLimits){
                        const { max, min } = getBathimetryLimits(data);
                        setBathimetryLimits({ min, max });
                    }
                    if (svgRef.current) {
                        createBathymetryChart(svgRef.current, data, level, lineColor);
                    }
                }
            })
        }
    }, [path, level])

    return (
        <div className='graph-container'>
            <svg ref={svgRef} id="bathimetry" width="420" height="250"></svg>
        </div>
    );
};