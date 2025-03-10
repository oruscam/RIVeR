import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useUiSlice } from '../../hooks';
import { GRAPHS } from '../../constants/constants';

export const OrthoImage = ({ solution } : { solution : { image: string, extent: number[], resolution: number} | undefined}) => { 
    const ref = useRef<SVGSVGElement>(null);
    const { screenSizes } = useUiSlice();
    const { width: screenWidth } = screenSizes;

    const graphWidth = screenWidth * GRAPHS.IPCAM_GRID_PROPORTION > GRAPHS.MIN_WIDTH ? screenWidth * GRAPHS.IPCAM_GRID_PROPORTION : GRAPHS.MIN_WIDTH
    
    useEffect(() => {
        if (ref.current === null) return;

        const { image, extent } = solution!;
        d3.select(ref.current).selectAll('*').remove();
        const svg = d3.select(ref.current);

        const width = +svg.attr('width');
        const height = +svg.attr('height');

        const margin = {top: 5, right: 5, bottom: 20, left: 40};

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
        const imgWidth = Math.abs(extent[1] - x);
        const imgHeight = Math.abs(extent[2] - y);

        console.log('x', x, 'y', y, 'imgWidth', imgWidth, 'imgHeight', imgHeight);

        svg.append('image')
            .attr('xlink:href', image)
            .attr('x', + xScale(x))
            .attr('y', + yScale(y))
            .attr('width', xScale(x + imgWidth) - xScale(x))
            .attr('height', Math.abs(yScale(y + imgHeight) - yScale(y)));

        // Define scale

        let scaleLength = (extent[1] - extent[0]) * 0.2
        scaleLength = Math.round(scaleLength / Math.pow(10, Math.floor(Math.log10(scaleLength)))) * Math.pow(10, Math.floor(Math.log10(scaleLength)));

        // // Add text in the bottom right corner inside the image
        // svg.append('text')
        //     .attr('x', xScale(xMax))
        //     .attr('y', yScale(yMin))
        //     .attr('text-anchor', 'end')
        //     .attr('dy', '-0.5em')
        //     .style('font-size', '12px')
        //     .attr('fill', 'white')
        //     .text(scaleLength);

        // Define scale bar position and dimensions
        const marginScale = (extent[1] - extent[0]) * 0.05;
        const barHeight = (extent[3] - extent[2]) * 0.015;
        const xPos = extent[1] - marginScale - scaleLength;
        const yPos = extent[2] + marginScale + 0.8;

        // Add scale bar
        svg.append('rect')
            .attr('x', xScale(xPos))
            .attr('y', yScale(yPos))
            .attr('width', xScale(scaleLength) - xScale(0))
            .attr('height', yScale(0) - yScale(barHeight))
            .attr('fill', 'white')
            .attr('stroke', 'black');

        // Add text label for the scale bar
        svg.append('text')
            .attr('x', xScale(xPos + scaleLength / 2))
            .attr('y', yScale(yPos) - 10)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .attr('fill', 'white')
            .attr('font-weight', 'bold')
            .text(`${scaleLength} m`);

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
        <div id='ortho-image-solution'>
            <svg ref={ref} width={graphWidth} height={300}/>
        </div>
    )
}