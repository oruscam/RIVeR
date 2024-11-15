import * as d3 from 'd3'
import { COLORS } from '../../constants/constants';
import { generateYAxisTicks } from '../../helpers';

interface CreateVelocityChartProps {
    sizes : {
        width: number,
        height: number,
        margin: {
            top: number,
            right: number,
            bottom: number,
            left: number
        },
        graphHeight: number,
    },
    SVGElement: SVGSVGElement,
    xScale: d3.ScaleLinear<number, number>,
    streamwise_velocity_magnitude: number[],
    percentile5: number[],
    percentile95: number[],
    minusStd: number[],
    plusStd: number[],
    distance: number[],
    showStd?: boolean
    showPercentile?: boolean
    isReport?: boolean
}

export const createVelocityChart = ( { SVGElement, xScale, streamwise_velocity_magnitude, percentile5, percentile95, minusStd, plusStd, distance, sizes, showStd = true, showPercentile = true, isReport = false } : CreateVelocityChartProps ) => {
    const svg = d3.select(SVGElement);
    const { margin, graphHeight, width } = sizes;

    const minDomainValue = Math.min(d3.min(percentile5)!, d3.min(minusStd)!);
    const maxDomainValue = Math.max(d3.max(percentile95)!, d3.max(plusStd)!);

    // y Scale

    const yScale = d3.scaleLinear()
        .domain([minDomainValue, maxDomainValue])
        .range([(graphHeight * 2 + ( isReport ? -20 : -50)), graphHeight + (isReport ? 30 : -10)]);

    // y Axis

    // Create and add Y ticks
    const ticks = generateYAxisTicks(streamwise_velocity_magnitude, minDomainValue, maxDomainValue);

    const yAxis = d3.axisLeft(yScale)
        .tickValues(ticks)
    
    svg.append('g')
    .attr('class', 'y-axis y-axis-2')
    .attr('transform', `translate(${margin.left + 10},0)`)
    .call(yAxis)
    .selectAll('.tick text')
    .style('font-size', '14px')

    // Create and add Y gridlines

    const makeYGridlines = () => d3.axisLeft(yScale).tickValues(ticks);
    
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(${margin.left + 10},0)`)
        .call(makeYGridlines()
            .tickSize(-width + margin.left + margin.right)
            .tickFormat('' as any))
            .attr('stroke', 'grey')
            .attr('stroke-width', 0.05);


    const line = d3.line<number>()
        .x((_d, i) => xScale(distance[i]))
        .y((d, _i) => yScale(d))

    // std Area
    
    const areaStd = d3.area<number>()
        .x((_d, i) => xScale(distance[i]))
        .y0((_d, i) => yScale(plusStd[i]))
        .y1((_d, i) => yScale(minusStd[i]))


    // Percentile 5th and 95th area

    const areaPercentile = d3.area<number>()
        .x((_d, i) => xScale(distance[i]))
        .y0((_d, i) => yScale(percentile5[i]))
        .y1((_d, i) => yScale(percentile95[i]))


    // Add the percentile area
    if( showPercentile ){
        const areaPath = svg.append('path')
            .datum(percentile95)
            .attr('fill', COLORS.PERCENTILE_AREA)
            .attr('d', areaPercentile);
        
        if( isReport ){
            // Crear un grupo para la leyenda
            const legendGroup = svg.append('g')
                .attr('class', 'legend-group')
                .attr('transform', `translate(${( width/4)*1 + 10}, ${graphHeight + 5})`);

            // Agregar un rectángulo de color
            legendGroup.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', COLORS.PERCENTILE_AREA);

            // Agregar texto al lado del rectángulo
            legendGroup.append('text')
                .attr('x', 20) // ajustar la posición horizontal para que no se superponga con el rectángulo
                .attr('y', 12) // ajustar la posición vertical para alinear con el rectángulo
                .attr('font-size', '15px')
                .attr('fill', 'white')
                .text('5% - 95%');
        } else {

            // Crear un elemento de texto para la leyenda
            const legend = svg.append('text')
                .attr('x', 10) // posición inicial
                .attr('y', 10) // posición inicial
                .attr('visibility', 'hidden') // oculto por defecto
                .attr('font-size', '15px')
                .attr('fill', COLORS.WHITE);

            // Agregar eventos de mouseover y mouseout
            areaPath.on('mouseover', function(_event) {
                legend.attr('visibility', 'visible')
                    .text('5% | 95% percentile');
            });

            areaPath.on('mousemove', function(event) {
                const [x, y] = d3.pointer(event);
                legend.attr('x', x + 10) // ajustar la posición de la leyenda
                    .attr('y', y - 10);
            });

            areaPath.on('mouseout', function() {
                legend.attr('visibility', 'hidden');
            });
        }
            
    }    

    // Add the std area

    if( showStd ){
        const areaPath = svg.append('path')
            .datum(plusStd)
            .attr('fill', COLORS.STD_AREA)
            .attr('d', areaStd);
        
        if( isReport ){
            // Crear un grupo para la leyenda

            const legendGroup = svg.append('g')
                .attr('class', 'legend-group')
                .attr('transform', `translate(${( width/4)*2 + 10}, ${graphHeight + 5})`);
            
            // Agregar un rectángulo de color

            legendGroup.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', COLORS.STD_AREA);

            // Agregar texto al lado del rectángulo

            legendGroup.append('text')
                .attr('x', 20) // ajustar la posición horizontal para que no se superponga con el rectángulo
                .attr('y', 12) // ajustar la posición vertical para alinear con el rectángulo
                .attr('font-size', '15px')
                .attr('fill', 'white')
                .text('Vel std');

        } else {
            // Crear un elemento de texto para la leyenda

            const legend = svg.append('text')
                .attr('x', 10) // posición inicial
                .attr('y', 10) // posición inicial
                .attr('visibility', 'hidden') // oculto por defecto
                .attr('font-size', '15px')
                .attr('fill', COLORS.WHITE);

            // Agregar eventos de mouseover y mouseout
            
            areaPath.on('mouseover', function(_event) {
                legend.attr('visibility', 'visible')
                    .text('± std');
            });

            areaPath.on('mousemove', function(event) {
                const [x, y] = d3.pointer(event);
                legend.attr('x', x + 10) // ajustar la posición de la leyenda
                    .attr('y', y - 10);
            });

            areaPath.on('mouseout', function() {
                legend.attr('visibility', 'hidden');
            });
        }       
    }

     // Add the velocity line    

     svg.append('path')
        .datum(streamwise_velocity_magnitude)
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('stroke', COLORS.WHITE)
        .attr('d', line);

    // label for Velocity

    svg.append('text')
        .attr('class', 'y-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', - (graphHeight *2) + (isReport ? 90 : 140))
        .attr('y', margin.left - 35)
        .attr('transform', 'rotate(-90)')
        .attr('fill', 'white')
        .attr('font-size', '22px')
        .text('Velocity');

}