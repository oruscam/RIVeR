import * as d3 from 'd3';

export const scaleBar = (extent: number[], svg: SVGSVGElement, xScale: d3.ScaleLinear<number, number>, yScale: d3.ScaleLinear<number, number>, clipPath: string, marginLeft: number, marginTop: number) => {
    // Define scale. With the extent of the image, we can calculate the scale of the image.
    let scaleLength = (extent[1] - extent[0]) * 0.2;
    scaleLength = Math.round(scaleLength / Math.pow(10, Math.floor(Math.log10(scaleLength)))) * Math.pow(10, Math.floor(Math.log10(scaleLength)));

    // Define scale bar positions and dimensions
    const marginScale = (extent[1] - extent[0]) * 0.05;
    const barHeight = (extent[3] - extent[2]) * 0.015;
    const xPos = extent[1] - marginScale - scaleLength;
    const yPos = extent[2] + marginScale + 0.8;

    // Remove any previous scale bar before adding a new one
    d3.select(svg).selectAll('.scale-bar').remove();

    // Add scale bar to the svg
    const scaleBarGroup = d3.select(svg)
        .append('g')
        .attr('class', 'scale-bar');

    if (clipPath) {
        scaleBarGroup.attr('clip-path', `url(#${clipPath})`);
    }

    scaleBarGroup.append('rect')
        .attr('x', marginLeft + xScale(xPos))
        .attr('y', marginTop + yScale(yPos))
        .attr('width', xScale(scaleLength) - xScale(0))
        .attr('height', yScale(0) - yScale(barHeight))
        .attr('fill', 'white')
        .attr('stroke', 'black');

    scaleBarGroup.append('text')
        .classed('scale-bar-text', true)
        .attr('x', marginLeft + xScale(xPos + scaleLength / 2))
        .attr('y', marginTop + yScale(yPos) - 10)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .attr('fill', 'white')
        .attr('font-weight', 'bold')
        .text(`${scaleLength} m`);
}