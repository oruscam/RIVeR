
import { useEffect, useRef } from 'react'
import './graphs.css'
import { useProjectSlice, useSectionSlice } from '../../hooks'
import { DrawSections } from '../DrawSections'
import { Layer, Stage } from 'react-konva'
import * as d3 from 'd3'

export const VelocityVector = ({ height, width, factor }) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { sections, activeSection } = useSectionSlice();
    const { firstFramePath } = useProjectSlice();
    
    // useEffect(() => {
    //     if (svgRef.current && sections[activeSection]) {
    //         const svg = d3.select(svgRef.current);
    //         svg.attr("width", width)
    //             .attr("height", height)
    //             .style("background-color", "transparent");


    //         const { points } = sections[activeSection];
    //         if (points.length >= 2) {
    //             const [start, end] = points;
    //             const vectors = d3.range(10).map(i => {
    //                 let color = '#0678BE';
    //                 if ( i == 8){
    //                     color = '#FF0000';
    //                 }

    //                 return{
    //                 x: start.x + (end.x - start.x) * (i / 9),
    //                 y: start.y + (end.y - start.y) * (i / 9),
    //                 color: color
    //             }});

    //             vectors.forEach((vector, index) => {
    //                 svg.append("defs").append("marker")
    //                     .attr("id", `arrow-${index}`)
    //                     .attr("viewBox", "0 -5 10 10")
    //                     .attr("refX", 10)
    //                     .attr("refY", 0)
    //                     .attr("markerWidth", 6)
    //                     .attr("markerHeight", 6)
    //                     .attr("orient", "auto-start-reverse")
    //                     .append("path")
    //                     .attr("d", "M0,-5L10,0L0,5")
    //                     .attr('fill', vector.color);
    //             });
                
    //             // Crear líneas y asignar el marcador correspondiente
    //             svg.selectAll('line')
    //                 .data(vectors)
    //                 .enter()
    //                 .append('line')
    //                 .attr('x1', d => d.x / factor.x)
    //                 .attr('y1', d => d.y / factor.y)
    //                 .attr('x2', d => (d.x) / factor.x)
    //                 .attr('y2', d => (d.y - Math.random() * 150) / factor.y)
    //                 .attr('stroke', d => d.color)
    //                 .attr('stroke-width', 2)
    //                 .attr('marker-end', (_d, i) => `url(#arrow-${i})`);
    //         }
    //     }
    // }, [factor.x, factor.y, sections[activeSection].points]);

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()

        if (svgRef.current) {
            const svg = d3.select(svgRef.current);
            svg.attr("width", width)
                .attr("height", height)
                .style("background-color", "transparent");

            sections.forEach((section, sectionIndex) => {
                if(sectionIndex === 0) return;
                const { points } = section;
                if (points.length >= 2) {
                    const [start, end] = points;
                    const vectors = d3.range(10).map(i => {
                        let color = '#0678BE';
                        if (i == 8) {
                            color = '#FF0000';
                        }

                        return {
                            x: start.x + (end.x - start.x) * (i / 9),
                            y: start.y + (end.y - start.y) * (i / 9),
                            color: color
                        };
                    });

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

                    // Crear líneas y asignar el marcador correspondiente
                    svg.selectAll(`line.section-${sectionIndex}`)
                        .data(vectors)
                        .enter()
                        .append('line')
                        .attr('x1', d => d.x / factor.x)
                        .attr('y1', d => d.y / factor.y)
                        .attr('x2', d => (d.x) / factor.x)
                        .attr('y2', d => (d.y - (50 + Math.random() * 90)) / factor.y)
                        .attr('stroke', d => d.color)
                        .attr('stroke-width', 2)
                        .attr('marker-end', (_d, i) => `url(#arrow-${sectionIndex}-${i})`);
                }
            });
        }
    }, [factor.x, factor.y, sections]);

    return (
        <div id="velocity-vector-container" style={{ width: width, height: height }}>
            <img src={'/@fs' + firstFramePath} width={width} height={height}></img>
            <Stage className='konva-data-container' width={width} height={height}>
              <Layer>
                <DrawSections factor={factor} draggable={false} />
              </Layer>
            </Stage>
            <svg ref={svgRef} id='velocity-vector'></svg>
        </div>
    )
}