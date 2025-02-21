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

    console.log('uMin', uMin, 'uMax', uMax, 'vMin', vMin, 'vMax', vMax)

    // Adjust the min and max values with padding
    uMin -= padding * (uMax - uMin);
    uMax += padding * (uMax - uMin);
    vMin -= padding * (vMax - vMin);
    vMax += padding * (vMax - vMin);
        
    console.log('uMin', uMin, 'uMax', uMax, 'vMin', vMin, 'vMax', vMax)

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
        .attr('x', margin.left)
        .attr('y', margin.top)
        .attr('width', width - margin.left - margin.right)
        .attr('height', height - margin.top - margin.bottom);

    // Create scatter plot circles with clip path
    svg.append('g')
        .attr('clip-path', 'url(#clip)')
        .selectAll('circle')
        .data(u.map((d, i) => ({ u: d, v: v[i] })))
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.u))
        .attr('cy', d => yScale(d.v))
        .attr('r', 3)
        .attr('fill', COLORS.LIGHT_BLUE)
        .attr('opacity', 0.5);

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
        .attr('opacity', 0.3);

    // Append mean vector to the SVG
    svg.append('line')
        .attr('x1', xScale(0))
        .attr('y1', yScale(0))
        .attr('x2', xScale(uMean))
        .attr('y2', yScale(vMean))
        .attr('stroke', COLORS.RED)
        .attr('stroke-width', 3);

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