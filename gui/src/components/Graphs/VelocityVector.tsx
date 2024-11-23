import { useEffect, useRef } from 'react'
import './graphs.css'
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks'
import * as d3 from 'd3'
import { SvgSectionLine } from '../SvgSectionLine'
import { drawVectors } from './index'

interface VelocityVectorProps {
    height: number;
    width: number;
    factor: number | { x: number, y: number };
    isReport?: boolean;
    index?: number;
}

export const VelocityVector = ({ height, width, factor, isReport = false, index }: VelocityVectorProps )  => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { sections, activeSection } = useSectionSlice();
    const { firstFramePath } = useProjectSlice();
    const { seeAll } = useUiSlice();
    const { data } = sections[activeSection];

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        const svg = d3.select(svgRef.current as SVGSVGElement);
        svg.attr("width", width)
            .attr("height", height)
            .style("background-color", "transparent");

        if (!isReport) {
            sections.forEach((section, sectionIndex) => {
                if (sectionIndex === 0) return;

                if (seeAll && activeSection !== sectionIndex) return;

                const { data, interpolated } = section;
                if (!data) return;

                drawVectors(svg, sections, factor, sectionIndex, interpolated, data, isReport);
            });
        } else {
            if (index !== undefined) {
                const { data, interpolated } = sections[index];
                if (!data) return;

                drawVectors(svg, sections, factor, index, interpolated, data, isReport);
            }
        }
    }, [factor, activeSection, seeAll, data]);

    const drawSvgSectionLine = () => {
        if (isReport){
            return sections.map((_section, i) => {
                if ( i === 0 ) return null;
                if ( i === index ){

                    return <SvgSectionLine key={index} factor={factor} index={index} isReport={isReport}/>
                }
            });
        } else {
            return sections.map((_section, index) => {
                if (index === 0) return null;
                return seeAll && activeSection !== index ? null : <SvgSectionLine key={index} factor={factor} index={index} isReport={isReport}/>;
            })
        }
    }
    return (
        <div id="velocity-vector-container" style={{ width: width, height: height }}>
            <img src={firstFramePath} width={width} height={height} style={isReport ? { borderRadius: '20px' } : {}}/>
            {
                drawSvgSectionLine()
            }
            <svg ref={svgRef} id='velocity-vector'/>
        </div>
    )
}