import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';
import cam_marker from '../../assets/cam_marker.svg'

interface PointsMapSvgProps {
    svgElement: SVGSVGElement;
    importedPoints: {
        X: number, 
        Y: number,
        selected: boolean,
    }[];
    activePoint: number | undefined;
    orthoImagePath: string | undefined;
    cameraPosition: number[] | undefined,
    orthoExtent: number[] | undefined,
}

export const pointsMapSvg = ({ svgElement, importedPoints, activePoint, orthoImagePath, cameraPosition, orthoExtent }: PointsMapSvgProps) => {
    const svg = d3.select(svgElement);

    const width = +svg.attr('width');
    const height = +svg.attr('height');

    const margin = {
        left: 10,
        top: 10,
        right: 10,
        bottom: 10,
    }

    // We need to unify all the points in one array.
    let xPoints = [
        ...importedPoints.map(d => d.X),
        // cameraPosition?.[0] ?? 0,
        orthoExtent?.[0] ?? 0,
        orthoExtent?.[1] ?? 0
    ].filter((d, i) => d !== 0 && d !== undefined );
    
    let yPoints = [
        ...importedPoints.map(d => d.Y),
        // cameraPosition?.[1] ?? 0,
        orthoExtent?.[2] ?? 0,
        orthoExtent?.[3] ?? 0
    ].filter(d => d !== 0 && d !== undefined);


    svg.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'points-map')

    let xScale = d3.scaleLinear()
        .domain([d3.min(xPoints), d3.max(xPoints)])
        .range([margin.left, width - margin.right])
    
    let yScale = d3.scaleLinear()
        .domain([d3.min(yPoints), d3.max(yPoints)])
        .range([height - margin.bottom, margin.top])

        
    if ( cameraPosition && orthoExtent  && orthoImagePath && 1 === 1 ) {
        
        drawAnalizeResult(importedPoints, activePoint, cameraPosition, orthoImagePath, orthoExtent, margin, width, height, svg, xScale, yScale)
        return;
        
    } else { 

        // Ticks on all edges

        const numTicks = 4
        const tickLength = 15
    
        svg.selectAll("line.x-tick-top")
            .data(xScale.ticks(numTicks))
            .enter()
            .append("line")
            .attr("class", "x-tick-top")
            .attr("x1", d => xScale(d))
            .attr("y1", 0)
            .attr("x2", d => xScale(d))
            .attr("y2", tickLength)
            .attr("stroke", "white")
        
        svg.selectAll("line.x-tick-bottom")
            .data(xScale.ticks(numTicks))
            .enter()
            .append("line")
            .attr("class", "x-tick-bottom")
            .attr("x1", d => xScale(d))
            .attr("y1", height - tickLength)
            .attr("x2", d => xScale(d))
            .attr("y2", height)
            .attr("stroke", "white")
        
        svg.selectAll("line.y-tick-left")
            .data(yScale.ticks(numTicks))
            .enter()
            .append("line")
            .attr("class", "y-tick-left")
            .attr("x1", 0)
            .attr("y1", d => yScale(d))
            .attr("x2", tickLength)
            .attr("y2", d => yScale(d))
            .attr("stroke", "white")
    
        svg.selectAll("line.y-tick-right")
            .data(yScale.ticks(numTicks))
            .enter()
            .append("line")
            .attr("class", "y-tick-right")
            .attr("x1", width - tickLength)
            .attr("y1", d => yScale(d))
            .attr("x2", width)
            .attr("y2", d => yScale(d))
            .attr("stroke", "white")       
        
        // Add white border
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'none')
            .attr('stroke', 'white')
            .attr('stroke-width', 2);
    }

    drawPoints(importedPoints, activePoint, margin, svg, xScale, yScale)
}


const drawPoints = (
    points: { X: number, Y: number, selected: boolean }[],
    activePoint: number | undefined,
    margin: { left: number, top: number, right: number, bottom: number },
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>
) => {

    const line1 = svg.selectAll("line.cross")
        .data(points)
        .enter()
        .append("line")
        .attr("x1", d => margin.left + xScale(d.X) - 5)
        .attr("y1", d => margin.top + yScale(d.Y) - 5)
        .attr("x2", d => margin.left + xScale(d.X) + 5)
        .attr("y2", d => margin.top + yScale(d.Y) + 5)
        .attr("stroke", (d, i) => i === activePoint ? COLORS.RED : d.selected === false ? COLORS.TRANSPARENT : COLORS.LIGHT_BLUE)
        .attr("stroke-width", 2);

    const line2 = svg.selectAll("line.cross")
        .data(points)
        .enter()
        .append("line")
        .attr("class", "cross")
        .attr("x1", d => margin.left + xScale(d.X) - 5)   
        .attr("y1", d => margin.top + yScale(d.Y) + 5)
        .attr("x2", d => margin.left + xScale(d.X) + 5)
        .attr("y2", d => margin.top + yScale(d.Y) - 5)
        .attr("stroke", (d, i) => i === activePoint ? COLORS.RED : d.selected === false ? COLORS.TRANSPARENT : COLORS.LIGHT_BLUE)        .attr("stroke-width", 2);

    return {
        line1,
        line2
    }
}

const drawAnalizeResult = (
    points: { X: number, Y: number, selected: boolean }[],
    activePoint: number | undefined,
    cameraPosition: number[],
    orthoImagePath: string,
    orthoExtent: number[],
    margin: { left: number, top: number, right: number, bottom: number },
    width: number,
    height: number,
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>
) => {
    margin.left = 80;
    margin.bottom = 80;
    margin.right = 20;
    margin.top = 20;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    xScale.range([0, innerWidth]);
    yScale.range([innerHeight, 0]);

    // Clip path para no exeder los ejes
    // Este es usado por la imagen y los puntos

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("x", margin.left)
        .attr("y", margin.top);

    // Calcula las coordenadas y dimensiones de la imagen
    const x = orthoExtent[0];
    const y = orthoExtent[3];
    const imgWidth = orthoExtent[1] - x;
    const imgHeight = orthoExtent[2] - y;

    // Append image to the container
    const image = svg.append('image')
        .attr('xlink:href', orthoImagePath)
        .attr('x', margin.left + xScale(orthoExtent[0]))
        .attr('y', margin.top + yScale(orthoExtent[3]))
        .attr('width', xScale(x + imgWidth) - xScale(x))
        .attr('height', Math.abs(yScale(y + imgHeight) - yScale(y)))
        .attr("clip-path", "url(#clip)");

    // Append the camera icon 
    const xOffset = -15;
    const yOffset = -15;
    const cameraCircle = svg.append('svg:image')
        .attr("xlink:href", cam_marker)
        .attr("width", 30)
        .attr("height", 30)
        .attr('x', margin.left + xScale(cameraPosition[0]) + xOffset)
        .attr('y', margin.top + yScale(cameraPosition[1]) + yOffset)
        .attr("clip-path", "url(#clip)")
        .on('mouseover', function(event) {
            d3.select(this).style('cursor', 'pointer')
            const [x, y] = d3.pointer(event);
            const tooltip = svg.append('text')
                .attr('id', 'tooltip')
                .attr('x', x + 10)
                .attr('y', y - 10)
                .attr('fill', 'white')
                .attr('font-size', '12px');
            
            tooltip.append('tspan')
                .attr('x', x + 10)
                .attr('dy', '1.2em')
                .text(`x: ${cameraPosition[0].toFixed(2)}`);
            
            tooltip.append('tspan')
                .attr('x', x + 10)
                .attr('dy', '1.2em')
                .text(`y: ${cameraPosition[1].toFixed(2)}`);
            
            tooltip.append('tspan')
                .attr('x', x + 10)
                .attr('dy', '1.2em')
                .text(`z: ${cameraPosition[2].toFixed(2)}`);
        })
        .on('mouseout', function() {
            d3.select(this).style('cursor', 'default')
            svg.select('#tooltip').remove();
        });

    const xAxis = d3.axisBottom(xScale)
        .ticks(3)

    const yAxis = d3.axisLeft(yScale)
        .ticks(5)

    // Cross Points    
    const { line1, line2 } = drawPoints(points, activePoint, margin, svg, xScale, yScale);

    // Add zoom and pan functionality
    const zoom = d3.zoom()
        .scaleExtent([0.4, 5])
        // .translateExtent([[0, 0], [width, height]])
        .translateExtent([[-width, -height], [2 * width, 2 * height]])
        .on('zoom', zoomed)
        .on('start', () => svg.style('cursor', 'move'))
        .on('end', () => svg.style('cursor', 'default'));

        // Create a transparent rectangle to capture zoom events
    svg.append('rect')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('x', margin.left)
        .attr('y', margin.top)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .call(zoom as any);

    function zoomed(event: any) {
        const transform = event.transform;
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);

        image
            .attr('xlink:href', orthoImagePath)
            .attr('x', margin.left + newXScale(orthoExtent[0]))
            .attr('y', margin.top + newYScale(orthoExtent[3]))
            .attr('width', newXScale(x + imgWidth) - newXScale(x))
            .attr('height', Math.abs(newYScale(y + imgHeight) - newYScale(y)))
            .attr("clip-path", "url(#clip)");

        cameraCircle
            .attr('x', margin.left + newXScale(cameraPosition[0]) + xOffset)
            .attr('y', margin.top + newYScale(cameraPosition[1]) + yOffset);

        line1
            .attr('x1', d => margin.left + newXScale(d.X) - 5)
            .attr('y1', d => margin.top + newYScale(d.Y) - 5)
            .attr('x2', d => margin.left + newXScale(d.X) + 5)
            .attr('y2', d => margin.top + newYScale(d.Y) + 5)
            .attr('clip-path', 'url(#clip)');

        line2
            .attr('x1', d => margin.left + newXScale(d.X) - 5)
            .attr('y1', d => margin.top + newYScale(d.Y) + 5)
            .attr('x2', d => margin.left + newXScale(d.X) + 5)
            .attr('y2', d => margin.top + newYScale(d.Y) - 5)
            .attr('clip-path', 'url(#clip)');

            svg.select('.x-axis').call(d3.axisBottom(newXScale).ticks(3));
            svg.select('.y-axis').call(d3.axisLeft(newYScale).ticks(5));
    }

    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(${margin.left}, ${height - margin.bottom})`)
        .call(xAxis)
        .attr('font-size', '12px')

    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .call(yAxis)
        .attr('font-size', '12px')

};