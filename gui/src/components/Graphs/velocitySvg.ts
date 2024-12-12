import * as d3 from 'd3'
import { COLORS } from '../../constants/constants';
import { generateYAxisTicks } from '../../helpers';
import './graphs.css'

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
    streamwise_velocity_magnitude: (number|null)[],
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

    const minDomainValue = Math.min(
        d3.min(percentile5.filter(d => d !== null))!,
        d3.min(minusStd.filter(d => d !== null))!,
        d3.min(streamwise_velocity_magnitude.filter(d => d !== null))!
    );
    const maxDomainValue = Math.max(
        d3.max(percentile95.filter(d => d !== null))!,
        d3.max(plusStd.filter(d => d !== null))!,
        d3.max(streamwise_velocity_magnitude.filter(d => d !== null))!
    );

    // y Scale

    const yScale = d3.scaleLinear()
        .domain([minDomainValue, maxDomainValue])
        .range([(graphHeight * 2 + ( isReport ? -40 : -50)), graphHeight + (isReport ? 30 : -10)]);

    // y Axis

    // Create and add Y ticks
    const ticks = generateYAxisTicks(streamwise_velocity_magnitude, minDomainValue, maxDomainValue);

    const yAxis = d3.axisLeft(yScale)
        .tickValues(ticks)
        .tickFormat(d3.format('.2f'))
        
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
            .attr('stroke-width', 0.15);

    const filteredData = streamwise_velocity_magnitude.map((d, i) => ({ velocity: d, distance: distance[i], plusStd: plusStd[i], minusStd: minusStd[i], percentile5: percentile5[i], percentile95: percentile95[i] }));

    const line = d3.line<{ velocity: number | null; distance: number; plusStd: number; minusStd: number; percentile5: number; percentile95: number; }>()
        .defined(d => d.velocity !== null)
        .x(d => xScale(d.distance))
        .y(d => yScale(d.velocity!))

    // std Area
    const areaStd = d3.area<{ velocity: number | null; distance: number; plusStd: number; minusStd: number; percentile5: number; percentile95: number; }>()
        .defined((d) => d.plusStd !== null && d.minusStd !== null)
        .x((d) => xScale(d.distance))
        .y0((d) => yScale(d.plusStd))
        .y1((d) => yScale(d.minusStd))

   
    // Percentile 5th and 95th area
    const areaPercentile = d3.area<{ velocity: number | null; distance: number; plusStd: number; minusStd: number; percentile5: number; percentile95: number; }>()
        .defined((d) => d.percentile5 !== null  && d.percentile95 !== null) 
        .x((d) => xScale(d.distance))
        .y0((d) => yScale(d.percentile5))
        .y1((d) => yScale(d.percentile95))


    // Add the percentile area
    if( showPercentile ){
        const areaPath = svg.append('path')
            .datum(filteredData)
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
            .datum(filteredData)
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
        .datum(filteredData)
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('stroke', COLORS.WHITE)
        .attr('d', line)

    // Add the circles and tooltip

    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('font-size', '16px')
        .style('font-weight', '500')
        .style('background', 'transparent')
        .style('border', 'none')
        .style('padding', '5px')
        .style('color', COLORS.WHITE)
        .style('display', 'none');
    
    const formatValue = d3.format(".2f");
    
    // Dibuja la línea que conectará el punto con el tooltip
    const lineToTooltip = svg.append('line')
        .attr('stroke', COLORS.WHITE)
        .attr('stroke-width', 1)
        .style('display', 'none');

    // Elimino los valores nulos de streamwise_velocity_magnitude    

    const filteredPoints = filteredData.filter(d => d.velocity !== null);

    // Dibuja los círculos en cada vértice con interactividad
    svg.selectAll('circle')
        .data(filteredPoints)
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.distance))
        .attr('cy', (d) => yScale(d.velocity!))
        .attr('r', 2.5) // Radio del círculo
        .attr('fill', COLORS.WHITE)
        .on('mouseover', function(_event, _d){
            d3.select(this).attr('r', 4);
            tooltip.style('display', 'block');
            lineToTooltip.style('display', 'block');
        })
        .each(function(d, i) {
            d3.select(this)
                .on('mousemove', function(event) {
                    const cx = xScale(d.distance);
                    const cy = yScale(d.velocity!);

                    tooltip
                        .html(`Velocity: ${formatValue(d.velocity!)}<br>Distance: ${formatValue(d.distance)}`)
                        .style('left', `${event.pageX + 10}px`)
                        .style('top', `${event.pageY - 100}px`);

                    lineToTooltip
                        .attr('x1', cx)
                        .attr('y1', cy)
                        .attr('x2', event.pageX - (svg.node()?.getBoundingClientRect().left ?? 0) + 10)
                        .attr('y2', event.pageY - (svg.node()?.getBoundingClientRect().top ?? 0) - 60);
                })
                .on('mouseout', function() {
                    d3.select(this).attr('r', 2.5);
                    tooltip.style('display', 'none');
                    lineToTooltip.style('display', 'none');
                });
        });

    // label for Velocity

    svg.append('text')
        .attr('class', 'y-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', - (graphHeight *2) + (isReport ? 90 : 140))
        .attr('y', margin.left - 35)
        .attr('transform', 'rotate(-90)')
        .attr('fill', 'white')
        .attr('font-size', '22px')
        .text('Velocity')
}