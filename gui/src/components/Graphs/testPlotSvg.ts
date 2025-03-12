import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';

/**
 * Generates a plot within an SVG element using D3.js.
 * 
 * @param {Object} params - The parameters for the function.
 * @param {SVGElement} params.svgElement - The SVG element where the plot will be rendered.
 * @param {Object} params.quiver - The quiver object containing the data for the plot.
 * @param {number[]} params.quiver.u - The u component of the quiver data.
 * @param {number[]} params.quiver.v - The v component of the quiver data.
 * @param {Function} params.t - A translation function for localizing axis labels.
 * 
 * @description
 * This function clears any existing content in the provided SVG element and generates a new plot based on the provided quiver data.
 * It creates scales for the x and y axes, appends grid lines, scatter plot circles, and a density plot to the SVG element.
 * Additionally, it appends x and y axes with labels to the SVG element.
 */

export const testPlotSvg = ({ svgElement, quiver, t } : { svgElement: SVGSVGElement, quiver: { u: number[], v: number[] }, t: (key: string) => string }) => {
    // Clear any existing content in the SVG element
    d3.select(svgElement).selectAll('*').remove();
    const svg = d3.select(svgElement);
    
    // Get the width and height of the SVG element
    const width = +svg.attr('width');
    const height = +svg.attr('height');

    // Define margins for the plot
    const margin = { top: 5, right: 40, bottom: 40, left: 40 };

    // Extract u and v components from the quiver object
    const { u, v: originV } = quiver;

    // Invert the v component
    const v = originV.map(d => -d);

    // Define padding for the scales
    const padding = 0.1;
    let uMin = d3.min(u) ?? 0;
    let uMax = d3.max(u) ?? 0;
    let vMin = d3.min(v) ?? 0;
    let vMax = d3.max(v) ?? 0;

    // Mean values
    const uMean = d3.mean(u) ?? 0;
    const vMean = d3.mean(v) ?? 0;

    // Adjust the min and max values with padding
    uMin -= padding * (uMax - uMin);
    uMax += padding * (uMax - uMin);
    vMin -= padding * (vMax - vMin);
    vMax += padding * (vMax - vMin);
        
        // Create scales for the x and y axes
    const xScale = d3.scaleLinear()
        .domain([uMin, uMax])
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([vMin, vMax])
        .range([height - margin.bottom, margin.top]);

    // Create grid lines for the x and y axes
    const xAxisGrid = d3.axisBottom(xScale).tickSize(-height + margin.top + margin.bottom).tickFormat('');
    const yAxisGrid = d3.axisLeft(yScale).tickSize(-width + margin.left + margin.right).tickFormat('');


    // Append x-axis grid lines to the SVG
    svg.append('g')
        .attr('class', 'x grid')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .attr('opacity', 0.2)
        .call(xAxisGrid);

    // Append y-axis grid lines to the SVG
    svg.append('g')
        .attr('class', 'y grid')
        .attr('transform', `translate(${margin.left},0)`)
        .attr('opacity', 0.2)
        .call(yAxisGrid);

    // Define clip path
    svg.append('defs')
        .append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('x', margin.left - 10)
        .attr('y', margin.top - 10)
        .attr('width', width - margin.left - margin.right + 20)
        .attr('height', height - margin.top - margin.bottom + 20);

    // Create scatter plot circles with clip path and interaction
    svg.append('g')
        .attr('clip-path', 'url(#clip)')
        .selectAll('circle')
        .data(u.map((d, i) => ({ u: d, v: v[i] })))
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.u))
        .attr('cy', d => yScale(d.v))
        .attr('r', 3)
        .attr('fill', COLORS.BLUE_WITH_TRANSPARENCY)
        .on('mouseover', function( _event, d) {
            d3.select(this)
                .attr('r', 6);
            svg.append('text')
                .attr('id', 'tooltip-u')
                .attr('x', xScale(d.u) + 15)
                .attr('y', yScale(d.v) - 10)
                .attr('font-size', 16)
                .attr('fill', 'white')
                .text(`u: ${d.u.toFixed(2)}px`);
            svg.append('text')
                .attr('id', 'tooltip-v')
                .attr('x', xScale(d.u) + 15)
                .attr('y', yScale(d.v) + 8)
                .attr('font-size', 16)
                .attr('fill', 'white')
                .text(`v: ${d.v.toFixed(2)}px`);
        })
        .on('mouseout', function() {
            d3.select(this)
                .attr('r', 3)
                .attr('fill', COLORS.BLUE);
            svg.select('#tooltip-u').remove();
            svg.select('#tooltip-v').remove();
        });

    // Density plot
    const densityData = d3.contourDensity()
        .x(d => xScale(d.u))
        .y(d => yScale(d.v))
        .size([width, height])
        .bandwidth(25)
        (u.map((d: number, i: number) => ({ u: d, v: v[i] })));

    svg.selectAll('path')
        .data(densityData)
        .enter()
        .append('path')
        .attr('d', d3.geoPath())
        .attr('fill', 'none')
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.3)
        .attr('clip-path', 'url(#clip)');

    // Append mean point to the SVG
    svg.append('circle')
        .attr('cx', xScale(uMean))
        .attr('cy', yScale(vMean))
        .attr('fill', COLORS.RED)
        .attr('r', 4)
        .on('mouseover', function(_event, d){
            d3.select(this)
                .attr('r', 7);
            svg.append('text')
                .attr('id', 'tooltip-mean-u')
                .attr('x', xScale(uMean) + 15)
                .attr('y', yScale(vMean) - 10)
                .attr('font-size', 16)
                .attr('fill', 'white')
                .text(`u: ${uMean.toFixed(2)}px`);
            
            svg.append('text')
                .attr('id', 'tooltip-mean-v')
                .attr('x', xScale(uMean) + 15)
                .attr('y', yScale(vMean) + 8)
                .attr('font-size', 16)
                .attr('fill', 'white')
                .text(`v: ${vMean.toFixed(2)}px`);   
        })
        .on('mouseout', function(){
            d3.select(this)
                .attr('r', 5)
                .attr('fill', COLORS.RED);
            svg.select('#tooltip-mean-u').remove()
            svg.select('#tooltip-mean-v').remove();
            
        })
        

    // Append x-axis to the SVG
    svg.append('g')
        .attr('transform', `translate(0,${yScale(0)})`)
        .call(d3.axisBottom(xScale).ticks(6).tickSizeOuter(0))
        .attr('stroke-width', 0.6)
        .attr('stroke-dasharray', '4,2');

    // Append y-axis to the SVG
    svg.append('g')
        .attr('transform', `translate(${xScale(0)},0)`)
        .call(d3.axisLeft(yScale).ticks(6).tickSizeOuter(0))
        .attr('stroke-width', 0.6)
        .attr('stroke-dasharray', '4,2');

    // Append x-axis label to the SVG
    svg.append('text')
        .attr('x', width / 2 + 40)
        .attr('y', height - 6)
        .attr('dy', -4)
        .attr('text-anchor', 'end')
        .attr('font-size', 16)
        .attr('fill', 'white')
        .attr('font-weight', '600')
        .text(t('Processing.Plot.u'));

    // Append y-axis label to the SVG
    svg.append('text')
        .attr('x', -height / 2 + 40)
        .attr('y', margin.left / 2)
        .attr('dy', -4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 16)
        .attr('fill', 'white')
        .attr('font-weight', '600')
        .attr('transform', 'rotate(-90)')
        .text(t('Processing.Plot.v'));
};