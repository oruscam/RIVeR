import * as d3 from 'd3'
import { COLORS, GRAPHS } from '../../constants/constants';
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
    magnitude: (number|null)[],
    percentile5: number[],
    percentile95: number[],
    minusStd: number[],
    plusStd: number[],
    distance: number[],
    showStd?: boolean,
    showPercentile?: boolean,
    isReport?: boolean,
    interpolated: boolean,
    check: boolean[],
    onChangeDataValues?: any
}

export const createVelocityChart = ( { SVGElement, xScale, magnitude, percentile5, percentile95, minusStd, plusStd, distance, interpolated, check, sizes, showStd = true, showPercentile = true, isReport = false, onChangeDataValues } : CreateVelocityChartProps ) => {
    const svg = d3.select(SVGElement);
    const { margin, graphHeight, width } = sizes;

    const minDomainValue = Math.min(
        d3.min(percentile5.filter(d => d !== null))!,
        d3.min(minusStd.filter(d => d !== null))!,
        d3.min(magnitude.filter(d => d !== null))!
    );
    const maxDomainValue = Math.max(
        d3.max(percentile95.filter(d => d !== null))!,
        d3.max(plusStd.filter(d => d !== null))!,
        d3.max(magnitude.filter(d => d !== null))!
    );

    // y Scale

    const yScale = d3.scaleLinear()
        .domain([minDomainValue, maxDomainValue])
        .range([(graphHeight * 2 + ( isReport ? -40 : -50)), graphHeight + (isReport ? 30 : -10)]);

    // y Axis

    // Create and add Y ticks
    const ticks = generateYAxisTicks(magnitude, minDomainValue, maxDomainValue);

    const yAxis = d3.axisLeft(yScale)
        .tickValues(ticks)
        .tickFormat(d3.format('.2f'))

    svg.append('g')
        .attr('class', 'y-axis y-axis-2')
        .attr('transform', `translate(${margin.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE},0)`)
        .call(yAxis)
        .selectAll('.tick text')
        .style('font-size', '14px')

    // Create and add Y gridlines

    const makeYGridlines = () => d3.axisLeft(yScale).tickValues(ticks);

    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(${margin.left + GRAPHS.GRID_Y_OFFSET_ALL_IN_ONE},0)`)
        .call(makeYGridlines()
            .tickSize(-width + margin.left + margin.right * 2)
            .tickFormat('' as any))
            .attr('stroke', 'grey')
            .attr('stroke-width', 0.15);

    const filteredData = magnitude.map((d, i) => {
        if ( interpolated === false && check[i] === false ){
            return {
                velocity: null,
                distance: distance[i],
                plusStd: plusStd[i],
                minusStd: minusStd[i],
                percentile5: percentile5[i],
                percentile95: percentile95[i],
            }
        } else {
            return { velocity: d, distance: distance[i], plusStd: plusStd[i], minusStd: minusStd[i], percentile5: percentile5[i], percentile95: percentile95[i] }
        }
    });

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

    let legendGroupOffsetY = 5

    // Add the percentile area
    const areaPathPercentile = svg.append('path')
        .datum(filteredData)
        .attr('fill', showPercentile ? COLORS.PERCENTILE_AREA : COLORS.TRANSPARENT)
        .attr('d', areaPercentile);


    if( isReport === false ){
        legendGroupOffsetY = -28
    }

    const legendGroupPercentile = svg.append('g')
    .attr('class', 'legend-group')
    .attr('transform', `translate(${( width/4)*1 + 30}, ${graphHeight + legendGroupOffsetY})`);

    // Append a colored rectangle for percentile
    legendGroupPercentile.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', showPercentile ? COLORS.PERCENTILE_AREA : COLORS.TRANSPARENT)
        .attr('stroke', COLORS.WHITE);

    // Append text  next to the rectangle
    legendGroupPercentile.append('text')
        .attr('x', 20) // ajustar la posición horizontal para que no se superponga con el rectángulo
        .attr('y', 13) // ajustar la posición vertical para alinear con el rectángulo
        .attr('font-size', '15px')
        .attr('fill', 'white')
        .text('5% - 95%');

     // Add the std area
    const areaPathStd = svg.append('path')
        .datum(filteredData)
        .attr('fill', showStd ? COLORS.STD_AREA : COLORS.TRANSPARENT)
        .attr('d', areaStd);

    // Create leyend for std area
    const legendGroupStd = svg.append('g')
        .attr('class', 'legend-group')
        .attr('transform', `translate(${( width/4)*2 + 48}, ${graphHeight + legendGroupOffsetY})`);

    // Append a colored rectangle for std
    legendGroupStd.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', showStd ? COLORS.STD_AREA : COLORS.TRANSPARENT)
        .attr('stroke', COLORS.WHITE);

    // Append text next to the rectangle

    legendGroupStd.append('text')
        .attr('x', 20) // ajustar la posición horizontal para que no se superponga con el rectángulo
        .attr('y', 13) // ajustar la posición vertical para alinear con el rectángulo
        .attr('font-size', '15px')
        .attr('fill', COLORS.WHITE)
        .text('Vel std');


    if ( isReport === false ){
        // Append active/disable percentile legend
        legendGroupPercentile.select('rect').on('click', function() {
            // Acción a realizar cuando se hace clic en el rectángulo de la leyenda
            onChangeDataValues({type: 'showPercentile'})
        });

        // Append active/disable std legend
        legendGroupStd.select('rect').on('click', function() {
            onChangeDataValues({type: 'showVelocityStd'})
        })
        
        if ( showPercentile ){
        // Append float legend for percentile
        const floatLegendPercentile = svg.append('text')
            .attr('x', 10) // posición inicial
            .attr('y', 10) // posición inicial
            .attr('visibility', 'hidden') // oculto por defecto
            .attr('font-size', '15px')
            .attr('fill', COLORS.WHITE);
  
          // Agregar eventos de mouseover y mouseout
          areaPathPercentile.on('mouseover', function(_event) {
              floatLegendPercentile.attr('visibility', 'visible')
                  .text('5% | 95% percentile');
          });
  
          areaPathPercentile.on('mousemove', function(event) {
              const [x, y] = d3.pointer(event);
              floatLegendPercentile.attr('x', x + 10) // ajustar la posición de la leyenda
                  .attr('y', y - 10);
          });
  
          areaPathPercentile.on('mouseout', function() {
              floatLegendPercentile.attr('visibility', 'hidden');
          });
        }

        if ( showStd ) {
            const floatLegendStd = svg.append('text')
                .attr('x', 10) // posición inicial
                .attr('y', 10) // posición inicial
                .attr('visibility', 'hidden') // oculto por defecto
                .attr('font-size', '15px')
                .attr('fill', COLORS.WHITE);

            // Agregar eventos de mouseover y mouseout

            areaPathStd.on('mouseover', function(_event) {
                floatLegendStd.attr('visibility', 'visible')
                    .text('± std');
            });

            areaPathStd.on('mousemove', function(event) {
                const [x, y] = d3.pointer(event);
                floatLegendStd.attr('x', x + 10) // ajustar la posición de la leyenda
                    .attr('y', y - 10);
            });

            areaPathStd.on('mouseout', function() {
                floatLegendStd.attr('visibility', 'hidden');
            });
        }
        
    }





        // }
        // else {
        //     // Crear un elemento de texto para la leyenda


        // }

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

    // Elimino los valores nulos de magnitude

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
        .attr('y', margin.left - 30)
        .attr('transform', 'rotate(-90)')
        .attr('fill', 'white')
        .attr('font-size', '22px')
        .text('Velocity')
}