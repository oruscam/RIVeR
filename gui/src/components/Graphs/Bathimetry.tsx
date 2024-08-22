import { useEffect, useRef } from 'react';
import { useSectionSlice } from '../../hooks';
import getBathimetryLimits from '../../helpers/getBathimetryLimits';
import bathParser from '../../helpers/bathimetryParser';
import { createBathymetryChart } from './bathimetrySvg';

export const Bathimetry = ({ setBathimetryLimits }: { setBathimetryLimits?: (limits: { min: number, max: number }) => void }) => {
    const { sections, activeSection } = useSectionSlice()
    const { blob, level, path } = sections[activeSection].bathimetry;
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if(path !== '' || blob){
            bathParser(blob ? blob : '/@fs' + path, 'csv').then(data => {
                if( data ){
                    if(level === 0 && setBathimetryLimits){
                        const { max, min } = getBathimetryLimits(data);
                        setBathimetryLimits({ min, max });
                    }
                    if (svgRef.current) {
                        createBathymetryChart(svgRef.current, data, level);
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