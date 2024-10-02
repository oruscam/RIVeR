import * as d3 from 'd3';
import { Point } from '../../store/section/types';
import { GREEN, RED, TRANSPARENT_WHITE, WHITE } from '../../constants/constants';

/**
 * Creates a bathymetry chart on the specified SVG element.
 * @param svgElement - The SVG element to create the chart on.
 * @param data - An array of data points for the chart.
 * @param level - The level value for shading the area between the horizontal line and the original graph.
 */

type BathymetryChartResult = {
    intersectionX?: number;
    error: string;
};

interface BathymetryChartProps {
    svgElement: SVGSVGElement;
    data: Point[];
    level: number;
    showLeftBank: boolean;
    drawGrid: boolean;
    leftBank?: number;
    rightBank?: number;
    xScaleAllInOne?: d3.ScaleLinear<number, number>;
    sizes?: {
        width: number;
        height: number;
        margin: {
            top: number;
            right: number;
            bottom: number;
            left: number;
        };
        graphHeight: number;
    };
    }


export const bathimetrySvg = ({svgElement, data, level, showLeftBank, drawGrid, leftBank, rightBank, xScaleAllInOne, sizes}: BathymetryChartProps) : BathymetryChartResult => {
    const svg = d3.select(svgElement);
    const width = +svg.attr('width');
    const height = +svg.attr('height');
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    const xMax = d3.max(data, d => d.x)!;
    const xMin = d3.min(data, d => d.x)!;

    let xScale;
    let yScale;

    if ( xScaleAllInOne && sizes ) {
        const { margin: marginSizes, height: heightSizes, graphHeight } = sizes;
        xScale = xScaleAllInOne;
        yScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.y)!, d3.max(data, d => d.y)!])
            .range([heightSizes - marginSizes.bottom, graphHeight*2]);

            svg.append('text')
                .attr('class', 'y-axis-label')
                .attr('text-anchor', 'end')
                .attr('x', - graphHeight *3 + 150)
                .attr('dy', '.75em')
                .attr('transform', 'rotate(-90)')
                .attr('fill', 'white')
                .attr('font-size', '20px')
                .text('Stage');

    } else {
        xScale = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([margin.left, width - margin.right]);
        
        yScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.y)!, d3.max(data, d => d.y)!])
            .range([height - margin.bottom, margin.top]);


        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('text-anchor', 'end')
            .attr('x', -height / 2 + margin.bottom)
            .attr('dy', '.75em')
            .attr('transform', 'rotate(-90)')
            .attr('fill', 'white')
            .attr('font-size', '20px')
            .text('Stage');
    }

    
    
    const line = d3.line<Point>()
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

    if( drawGrid ){
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
    }


        
    // Sombrear el área entre la línea horizontal y la gráfica original

    const area = d3.area<{ x: number, y: number }>()
        .x(d => xScale(d.x))
        .y0(d => yScale(Math.min(d.y , level)))
        .y1(_d => yScale(level));
        
    // Definir clip-path

    svg.append('defs')
        .append('clipPath')
        .attr('id', 'clip-bathymetry')
        .append('path')
        .datum(data)
        .attr('d', line);

    svg.append('path')
        .datum(data)
        .attr('fill', TRANSPARENT_WHITE)
        .attr('d', area)
        .attr('clip-path', 'url(#clip-bathymetry)'); // Aplicar clip-path

    // Añadir etiquetas de valor a los ejes

    svg.append('text')
        .attr('class', 'x-axis-label')
        .attr('x', width / 2 - margin.right)
        .attr('y', height)
        .attr('fill', 'white')
        .attr('font-size', '20px')
        .text('Station');



    // Bathymetry line

    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', WHITE)
        .attr('stroke-width', 1.5)
        .attr('d', line);
        
    if (showLeftBank) {
        let intersectionPoint = null;

        for (let i = 0; i < data.length - 1; i++) {
            const currentPoint = data[i];
            const nextPoint = data[i + 1];

            // Verifica si el nivel está entre los puntos actuales y siguientes
            if ((currentPoint.y <= level && nextPoint.y >= level) || (currentPoint.y >= level && nextPoint.y <= level)) {
                // Interpolación lineal para encontrar la posición exacta de intersección
                const t = (level - currentPoint.y) / (nextPoint.y - currentPoint.y);
                const intersectX = currentPoint.x + t * (nextPoint.x - currentPoint.x);
                intersectionPoint = { x: intersectX, y: level };
                break;
            }
        }

        if ( intersectionPoint ) {
            let xValue = intersectionPoint.x;
            let error = '';
            if ( leftBank !== undefined && leftBank >= xMin && leftBank <= xMax ) {
                xValue = leftBank;
            } else if(leftBank !== undefined){
                error = `Left Bank can be between ${xMin.toFixed(2)} and ${xMax.toFixed(2)}`;
            }
    
            svg.append('path')
                .attr('d', 'M -8 0 L 8 0 L 0 16 Z')
                .attr('fill', RED)
                .attr('transform', `translate(${xScale(xValue)}, ${yScale(level) - 16})`);

            if(rightBank && rightBank >= xMin && rightBank <= xMax){
                const x2Value = xValue + rightBank;
                if ( x2Value < xMax){
                    svg.append('path')
                        .attr('d', 'M -8 0 L 8 0 L 0 16 Z')
                        .attr('fill', GREEN)
                        .attr('transform', `translate(${xScale(x2Value)}, ${yScale(level) - 16})`);
                } else {
                    error = `Right Bank is out of range`;
                }
            } else if(rightBank !== undefined){
                error = `Right Bank can be between ${xMin.toFixed(2)} and ${xMax.toFixed(2)}`;
            }
            
            return { intersectionX: xValue, error };
        }
    }

    return {error: ''};    
}