import * as d3 from 'd3';
import { COLORS } from '../../constants/constants';
import cam_marker from '../../assets/cam_marker.svg'


interface PointsMapSvgProps {
    svgElement: SVGSVGElement;
    importedPoints: [{
        X: number, 
        Y: number,
    }];
    activePoint: number | undefined;
    ipcam_image: string | undefined;
    camera_position: [number, number, number] | undefined,
    ortho_extent: [number, number, number, number] | undefined,
}

export const pointsMapSvg = ({ svgElement, importedPoints, activePoint, ipcam_image, camera_position, ortho_extent }: PointsMapSvgProps) => {
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

    let x_points = [
        ...importedPoints.map(d => d.X),
        camera_position?.[0] ?? 0,
        ortho_extent?.[0] ?? 0,
        ortho_extent?.[1] ?? 0
    ].filter(d => d !== 0 && d !== undefined);
    
    let y_points = [
        ...importedPoints.map(d => d.Y),
        camera_position?.[1] ?? 0,
        ortho_extent?.[2] ?? 0,
        ortho_extent?.[3] ?? 0
    ].filter(d => d !== 0);

    svg.append('svg')
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'points-map')
        .style('background-color', COLORS.BLACK)

    let xScale = d3.scaleLinear()
        .domain([d3.min(x_points), d3.max(x_points)])
        .range([margin.left, width - margin.right])
    
    let yScale = d3.scaleLinear()
        .domain([d3.min(y_points), d3.max(y_points)])
        .range([height - margin.bottom, margin.top])

        
        if ( camera_position && ortho_extent  && ipcam_image && 1 === 1 ) {
            
            drawAnalizeResult(importedPoints, activePoint, camera_position, ipcam_image, ortho_extent, margin, width, height, svg, xScale, yScale)
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
    }


    drawPoints(importedPoints, activePoint, margin, svg, xScale, yScale)
}


const drawPoints = (
    points: { X: number, Y: number }[],
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
        .attr("stroke", (_d, i) => i === activePoint ? COLORS.RED : COLORS.LIGHT_BLUE)
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
        .attr("stroke", (_d, i) => i === activePoint ? COLORS.RED : COLORS.LIGHT_BLUE)
        .attr("stroke-width", 2);

    return {
        line1,
        line2
    }
}

const drawAnalizeResult = (
    points: { X: number, Y: number }[],
    activePoint: number | undefined,
    cameraPosition: [number, number, number],
    ipcamImage: string,
    orthoExtent: [number, number, number, number],
    margin: { left: number, top: number, right: number, bottom: number },
    width: number,
    height: number,
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>
) => {
    margin.left = 80
    margin.bottom = 40
    margin.right = 40
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    xScale.range([0, innerWidth])
    yScale.range([innerHeight, 0])

    // Clip path para no exeder los ejes
    // Este es usado por la imagen y los puntos

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("x", margin.left)
        .attr("y", margin.top)

    // Clip path para la camara

    svg.append("defs").append("clipPath")
        .attr("id", "clip-camera")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("x", margin.left - 15)
        .attr("y", margin.top + 15)
        
    // Append image to the container
    const image = svg.append('image')
        .attr('xlink:href', ipcamImage)
        .attr('x', margin.left + xScale(orthoExtent[0]))
        .attr('y', margin.top + yScale(orthoExtent[3]))
        .attr('width', xScale(orthoExtent[1]) - xScale(orthoExtent[0]))
        .attr('height', yScale(orthoExtent[2]) - yScale(orthoExtent[3]))
        .attr("clip-path", "url(#clip)");

    // Append the camera icon 
    const xOffset = -15
    const yOffset = -15

    const cameraCircle = svg.append('svg:image')
        .attr("xlink:href", cam_marker)
        .attr("width", 30)
        .attr("height", 30)
        .attr('x', margin.left + xScale(cameraPosition[0]) + xOffset)
        .attr('y', margin.top + yScale(cameraPosition[1]) + yOffset) 
        .attr("clip-path", "url(#clip-camera)");
        
    const xExtent = d3.extent(points, d => d.X);
    const yExtent = d3.extent(points, d => d.Y);
    
    const scaleXFactor = Math.pow(10, Math.floor(Math.log10(xExtent[1])) - 2);
    const scaleYFactor = Math.pow(10, Math.floor(Math.log10(yExtent[1])));
    
    const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d => (d / scaleXFactor).toFixed(3));
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => (d / scaleYFactor).toFixed(5));
    
    const gX = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${height - margin.bottom})`)
        .call(xAxis)
        .selectAll('.tick text')
        .style('font-size', '14px');
    
    svg.append('text')
        .attr('x', margin.left + innerWidth )
        .attr('y', height - margin.bottom + 30)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', 'white')
        .text(`+${scaleXFactor}`);
    
    const gY = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .call(yAxis)
        .selectAll('.tick text')
        .style('font-size', '14px');
    
    svg.append('text')
        .attr('x', margin.left + 40)
        .attr('y', margin.top + 10)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', 'white')
        .text(`x1e${Math.log10(scaleYFactor)}`);
    
    // Cross Points    
    const { line1, line2 } = drawPoints(points, activePoint, margin, svg, xScale, yScale)

    // Add zoom and pan functionality
    const zoom = d3.zoom()
        .scaleExtent([0.5, 5])
        .translateExtent([[0, 0], [width, height]])
        .on('zoom', zoomed);

    svg.call(zoom as any);

    function zoomed(event: any) {
        const transform = event.transform;
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);


        const newScaleXFactor = Math.pow(10, Math.floor(Math.log10(newXScale.domain()[1])) - 2);
        const newScaleYFactor = Math.pow(10, Math.floor(Math.log10(newYScale.domain()[1])));

        console.log('newXScale domain:', newXScale.domain());
        console.log('newYScale domain:', newYScale.domain());
        console.log('newScaleXFactor:', newScaleXFactor);
        console.log('newScaleYFactor:', newScaleYFactor);

        const newXAxis = d3.axisBottom(newXScale)
            .ticks(5)
            .tickFormat(d => (d / newScaleXFactor).toFixed(3));

        const newYAxis = d3.axisLeft(newYScale)
            .ticks(5)
            .tickFormat(d => (d / newScaleYFactor).toFixed(5));
            

        gX.call(newXAxis as any)
            .selectAll('.tick text')
            .style('font-size', '14px')
            .style('fill', 'white'); // Asegúrate de que el texto sea visible

        gY.call(newYAxis as any)
            .selectAll('.tick text')
            .style('font-size', '14px')
            .style('fill', 'white'); // Asegúrate de que el texto sea visible

        image
            .attr('x', margin.left + newXScale(orthoExtent[0]))
            .attr('y', margin.top + newYScale(orthoExtent[3]))
            .attr('width', newXScale(orthoExtent[1]) - newXScale(orthoExtent[0]))
            .attr('height', newYScale(orthoExtent[2]) - newYScale(orthoExtent[3]))
            .attr("clip-path", "url(#clip)");
            
        cameraCircle
            .attr('x', margin.left + newXScale(cameraPosition[0]) + xOffset)
            .attr('y', margin.top + newYScale(cameraPosition[1]) + yOffset)

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
    }   
}