import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useUiSlice } from '../../hooks';
import { GRAPHS } from '../../constants/constants';
import { scaleBar } from './scaleBar';

export const OrthoImage = ({ solution } : { solution : { orthoImage: string, extent: number[], resolution: number} | undefined}) => { 
    const ref = useRef<SVGSVGElement>(null);
    const { screenSizes } = useUiSlice();
    const { width: screenWidth } = screenSizes;

    const graphWidth = screenWidth * GRAPHS.IPCAM_GRID_PROPORTION < GRAPHS.ORTHO_IMAGE_MAX_HEIGHT ? screenWidth * GRAPHS.IPCAM_GRID_PROPORTION : GRAPHS.ORTHO_IMAGE_MAX_HEIGHT
    
    const { orthoImage, extent } = solution!;
    const imgWidth = Math.abs(extent[1] - extent[0]);
    const imgHeight = Math.abs(extent[2] - extent[3]);

    const aspectRatio = imgWidth / imgHeight;
    const graphHeight = aspectRatio > 1 ? graphWidth / aspectRatio : graphWidth;

    useEffect(() => {
        if (ref.current === null) return;
        
        d3.select(ref.current).selectAll('*').remove();
        const svg = d3.select(ref.current);

        const width = +svg.attr('width');
        const height = +svg.attr('height');

        const margin = { top: 5, right: 5, bottom: 20, left: 40 };

        svg.append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('class', 'ortho-image');

        const xMin = d3.min([extent[0], extent[1]].filter(d => d !== undefined))!;
        const yMin = d3.min([extent[2], extent[3]].filter(d => d !== undefined))!;
        const xMax = d3.max([extent[0], extent[1]].filter(d => d !== undefined))!;
        const yMax = d3.max([extent[2], extent[3]].filter(d => d !== undefined))!;

        const xScale = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([margin.left, width - margin.right]);

        const yScale = d3.scaleLinear()
            .domain([yMin, yMax])
            .range([height - margin.bottom, margin.top]);

        const x = extent[0];
        const y = extent[3];

        svg.append('image')
            .attr('xlink:href', orthoImage)
            .attr('x', + xScale(x))
            .attr('y', + yScale(y))
            .attr('width', xScale(x + imgWidth) - xScale(x))
            .attr('height', Math.abs(yScale(y + imgHeight) - yScale(y)));

        scaleBar(extent, ref.current, xScale, yScale, '', 0, 0);

        // Add X Axis with 5 ticks and increased font size
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(xScale).ticks(5))
            .selectAll('text')
            .style('font-size', '12px');

        // Add Y Axis with 5 ticks and increased font size
        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(yScale).ticks(5))
            .selectAll('text')
            .style('font-size', '12px');
    }, [solution, graphWidth]);

    return (
        <div id='ortho-image-solution' className='mb-2'>
            <svg ref={ref} width={graphWidth} height={graphHeight}/>
        </div>
    )
}