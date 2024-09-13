
import { useEffect, useMemo, useRef } from 'react'
import './graphs.css'
import { useProjectSlice, useSectionSlice, useUiSlice } from '../../hooks'
import { DrawSections } from '../DrawSections'
import { Layer, Stage } from 'react-konva'
import * as d3 from 'd3'
import { BLUE, RED, VECTOR_FACTOR } from '../../constants/constants'

interface VelocityVectorProps {
    height: number;
    width: number;
    factor: { x: number, y: number };
}

export const VelocityVector = ({ height, width, factor }: VelocityVectorProps )  => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { sections, activeSection } = useSectionSlice();
    const { firstFramePath } = useProjectSlice();
    const { seeAll } = useUiSlice();
    
    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        const { data } = sections[activeSection]
        if (svgRef.current && data) {
            
            const svg = d3.select(svgRef.current);
            svg.attr("width", width)
                .attr("height", height)
                .style("background-color", "transparent");

            sections.forEach((_section, sectionIndex) => {
                if(sectionIndex === 0) return;
                if(seeAll && activeSection !== sectionIndex) return;
                
                const { x, y, displacement_x_streamwise, displacement_y_streamwise, check } = data;


                const xFiltered = x.filter((d, _i) => d !== null);
                const yFiltered = y.filter((d, _i) => d !== null);
                const displacementXFiltered = displacement_x_streamwise.filter((d, _i) => d !== null);
                const displacementYFiltered = displacement_y_streamwise.filter((d, _i) => d !== null);


                // const vectors = d3.range(x.length)
                const vectors = d3.range(xFiltered.length).map(i => {
                    return {
                        x: xFiltered[i] + displacementXFiltered[i],
                        y: yFiltered[i] + displacementYFiltered[i],
                        color: check[i] ? BLUE : RED
                        };
                    })
                

                svg.selectAll(`line.section-${sectionIndex}`)
                    .data(vectors)
                    .enter()
                    .append('line')
                    .attr('x1', d => d.x / factor.x)
                    .attr('y1', d => d.y / factor.y)
                    .attr('x2', (d, i) => (d.x - (displacementXFiltered[i]) * VECTOR_FACTOR) / factor.x)
                    .attr('y2', (d,i) => (d.y - (displacementYFiltered[i]) * VECTOR_FACTOR)/ factor.y)
                    .attr('stroke', d => d.color)
                    .attr('stroke-width', 2.8)
                    .attr('marker-end', (_d, i) => `url(#arrow-${sectionIndex}-${i})`);

                vectors.forEach((vector, index) => {
                    svg.append("defs").append("marker")
                        .attr("id", `arrow-${sectionIndex}-${index}`)
                        .attr("viewBox", "0 -5 10 10")
                        .attr("refX", 10)
                        .attr("refY", 0)
                        .attr("markerWidth", 6)
                        .attr("markerHeight", 6)
                        .attr("orient", "auto-start-reverse")
                        .append("path")
                        .attr("d", "M0,-5L10,0L0,5")
                        .attr('fill', vector.color);
                });

            });
        }
    }, [factor.x, factor.y, sections, activeSection, seeAll]);

    return (
        <div id="velocity-vector-container" style={{ width: width, height: height }}>
            <img src={'/@fs' + firstFramePath} width={width} height={height}></img>
            <Stage className='konva-data-container' width={width} height={height}>
              <Layer>
                <DrawSections factor={factor} draggable={false} drawPins={true}/>
              </Layer>
            </Stage>
            <svg ref={svgRef} id='velocity-vector'></svg>
        </div>
    )
}


                // if (points.length >= 2) {
                //     const [start, end] = points;
                //     const offset = 5; // Ajusta este valor según sea necesario
                
                //     const adjustedStart = {
                //         x: start.x + (end.x - start.x) * (offset / 100),
                //         y: start.y + (end.y - start.y) * (offset / 100)
                //     };
                
                //     const adjustedEnd = {
                //         x: end.x - (end.x - start.x) * (offset / 100),
                //         y: end.y - (end.y - start.y) * (offset / 100)
                //     };
                
                //     const vectors = d3.range(10).map(i => {
                //         let color = '#0678BE';
                //         if (i == 8) {
                //             color = '#ED6B57';
                //         }
                
                //         return {
                //             x: adjustedStart.x + (adjustedEnd.x - adjustedStart.x) * (i / 9),
                //             y: adjustedStart.y + (adjustedEnd.y - adjustedStart.y) * (i / 9),
                //             color: color
                //         };
                //     });

                //     vectors.forEach((vector, index) => {
                //         svg.append("defs").append("marker")
                //             .attr("id", `arrow-${sectionIndex}-${index}`)
                //             .attr("viewBox", "0 -5 10 10")
                //             .attr("refX", 10)
                //             .attr("refY", 0)
                //             .attr("markerWidth", 6)
                //             .attr("markerHeight", 6)
                //             .attr("orient", "auto-start-reverse")
                //             .append("path")
                //             .attr("d", "M0,-5L10,0L0,5")
                //             .attr('fill', vector.color);
                //     });

                //     // Crear líneas y asignar el marcador correspondiente
                //     svg.selectAll(`line.section-${sectionIndex}`)
                //         .data(vectors)
                //         .enter()
                //         .append('line')
                //         .attr('x1', d => d.x / factor.x)
                //         .attr('y1', d => d.y / factor.y)
                //         .attr('x2', d => (d.x) / factor.x)
                //         .attr('y2', d => (d.y - (50 + Math.random() * 90)) / factor.y)
                //         .attr('stroke', d => d.color)
                //         .attr('stroke-width', 2)
                //         .attr('marker-end', (_d, i) => `url(#arrow-${sectionIndex}-${i})`);
                // }