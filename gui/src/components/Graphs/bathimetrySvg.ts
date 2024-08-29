import * as d3 from 'd3';

interface DataPoint {
    x: number; 
    y: number;
}

/**
 * Creates a bathymetry chart on the specified SVG element.
 * @param svgElement - The SVG element to create the chart on.
 * @param data - An array of data points for the chart.
 * @param level - The level value for shading the area between the horizontal line and the original graph.
 */

export const createBathymetryChart = (svgElement: SVGSVGElement, data: DataPoint[], level: number, lineColor: string) => {
    const svg = d3.select(svgElement);
    const width = +svg.attr('width');
    const height = +svg.attr('height');
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    const xScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.x)!, d3.max(data, d => d.x)!])
        .range([margin.left, width - margin.right]);
    
    const yScale = d3.scaleLinear()
        .domain([d3.min(data, d => d.y)!, d3.max(data, d => d.y)!])
        .range([height - margin.bottom, margin.top]);
    
    const line = d3.line<DataPoint>()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));

    // Añadir ejes con ticks
    
    const xAxis = d3.axisBottom(xScale).ticks(5);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(xAxis)
        .selectAll('.domain');

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis)
        .selectAll('.domain');

    svg.selectAll('.tick line')
        .attr('stroke', 'lightgrey')
        .attr('stroke-width', 0.2);

    // Añadir cuadrícula

    const makeXGridlines = () => d3.axisBottom(xScale).ticks(5);
    const makeYGridlines = () => d3.axisLeft(yScale).ticks(5);

    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(makeXGridlines()
            .tickSize(-height + margin.top + margin.bottom)
            .tickFormat('' as any))
        .attr('stroke', 'grey')
        .attr('stroke-width', 0.05);

    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(${margin.left},0)`)
        .call(makeYGridlines()
            .tickSize(-width + margin.left + margin.right)
            .tickFormat('' as any))
        .attr('stroke', 'grey')
        .attr('stroke-width', 0.05);

    // Sombrear el área entre la línea horizontal y la gráfica original
    const area = d3.area<{ x: number, y: number }>()
    .x(d => xScale(d.x))
    .y0(d => yScale(Math.min(d.y, level)))
    .y1(_d => yScale(level));

    svg.append('path')
        .datum(data)
        .attr('fill', 'grey')
        .attr('d', area);        


    // Añadir etiquetas de valor a los ejes
    svg.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', width / 2 - margin.right)
        .attr('y', height - 6)
        .attr('fill', 'white')
        .text('Station');

    svg.append('text')
        .attr('class', 'y-axis-label')
        .attr('text-anchor', 'end')
        .attr('x', -height / 2 + margin.bottom)
        .attr('dy', '.75em')
        .attr('transform', 'rotate(-90)')
        .attr('fill', 'white')
        .text('Stage');

    // Bathymetry line

    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', 1.5)
        .attr('d', line)
  

}   

