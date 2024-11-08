import { useEffect, useRef } from 'react'
import './graphs.css'
import * as d3 from 'd3'
import { useSectionSlice, useUiSlice } from '../../hooks'
import { createDischargeChart } from './dischargeSvg'
import { createVelocityChart } from './velocitySvg'
import { bathimetrySvg } from './bathimetrySvg'
import { GRAPH_WIDTH_PROPORTION, MIN_GRAPH_WIDTH } from '../../constants/constants'

/**
 * * Version 0.0.1
 * * 
 * @returns 
 */

export const AllInOne = ({ width, height, index, isReport  } : {width?: number, height?: number, index?: number, isReport: boolean}) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { sections, activeSection } = useSectionSlice();
    const { data, bathimetry } = sections[index ? index : activeSection]
    const { line: bathData, level } = bathimetry
    const { screenSizes } = useUiSlice()
    const { width: screenWidth } = screenSizes

    const graphWidth = screenWidth * GRAPH_WIDTH_PROPORTION > MIN_GRAPH_WIDTH ? screenWidth * GRAPH_WIDTH_PROPORTION : MIN_GRAPH_WIDTH

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if(svgRef.current === null) return

            if(data){
                const svg = d3.select(svgRef.current)
                const width = +svg.attr('width')
                const height = +svg.attr('height')
                const margin = { top: 20, right: 30, bottom: 40, left: 50 }
                const graphHeight = (height) / 3
                

                const { distance, streamwise_magnitude, plus_std, minus_std, percentile_95th, percentile_5th, Q, Q_portion, show95Percentile, showVelocityStd } = data

                // Filter null values

                const filteredStreamwiseMagnitude = streamwise_magnitude.filter(d => d !== null).map(Number);
                const filteredPlusStd = plus_std.filter(d => d !== null);
                const filteredMinusStd = minus_std.filter(d => d !== null);
                const filteredPercentile_95th = percentile_95th.filter(d => d !== null);
                const filteredPercentile_5th = percentile_5th.filter(d => d !== null);
                const filteredQ = Q.filter(d => d !== null);
                const filteredQPortion = Q_portion.filter(d => d !== null);

                // xScale for bathimetry
                if( ! bathData ) return;
                const xScaleBathimetry = d3.scaleLinear()
                    .domain([d3.min(bathData.map(d => d.x))!, d3.max(bathData.map(d => d.x))!])
                    .range([margin.left, width - margin.right])

                // xScale for velocity and discharge

                const xScale = d3.scaleLinear()
                    .domain([d3.min(distance)!, d3.max(distance)!])
                    .range([margin.left, width - margin.right]) 


                // Common xAxis

                // const xScaleMax = d3.max(xScale.domain())!;
                // const xScaleBathimetryMax = d3.max(xScaleBathimetry.domain())!;
                // const xAxisScale = xScaleMax > xScaleBathimetryMax ? xScale : xScaleBathimetry;

                const xAxisScale = xScaleBathimetry;
                
                const xAxis = d3.axisBottom(xAxisScale).ticks(5);

                // Append xAxis

                svg.append('g')
                    .attr('transform', `translate(0,${height - margin.bottom})`)
                    .call(xAxis)
                    .selectAll('.domain')

                svg.selectAll('.tick line')
                    .attr('stroke', 'lightgrey')
                    .attr('stroke-width', 0.2);

                // Create yGrid    
                
                const yScaleGrid = d3.scaleLinear()
                    .domain([d3.min(filteredStreamwiseMagnitude)!, d3.max(filteredStreamwiseMagnitude)!])
                    .range([height - margin.bottom, margin.top]);

                const makeXGridlines = () => d3.axisBottom(xScale).ticks(5);
                const makeYGridlines = () => d3.axisLeft(yScaleGrid).ticks(8);

                // Add xGrid

                svg.append('g')
                    .attr('class', 'grid')
                    .attr('transform', `translate(0,${height - margin.bottom})`)
                    .call(makeXGridlines()
                    .tickSize(-height + margin.top + margin.bottom)
                    .tickFormat('' as any))
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 0.05);

                // Add yGrid
                
                svg.append('g')
                    .attr('class', 'grid')
                    .attr('transform', `translate(${margin.left},0)`)
                    .call(makeYGridlines()
                        .tickSize(-width + margin.left + margin.right)
                        .tickFormat('' as any))
                    .attr('stroke', 'grey')
                    .attr('stroke-width', 0.05);


                createDischargeChart({
                    SVGElement: svgRef.current,
                    distance,
                    Q: filteredQ,
                    QPortion: filteredQPortion,
                    sizes: { width, height, margin, graphHeight },
                    isReport
                });
                
                createVelocityChart({
                    SVGElement: svgRef.current,
                    xScale,
                    streamwise_magnitude: filteredStreamwiseMagnitude,
                    percentile5: filteredPercentile_5th,
                    percentile95: filteredPercentile_95th,
                    minusStd: filteredMinusStd,
                    plusStd: filteredPlusStd,
                    distance,
                    sizes: { width, height, margin, graphHeight },
                    showPercentile: show95Percentile,
                    showStd: showVelocityStd,
                    isReport
                });
                
                bathimetrySvg({
                    svgElement: svgRef.current,
                    data: bathData,
                    level,
                    showLeftBank: false,
                    sizes: { width, height, margin, graphHeight },
                    drawGrid: false,
                    xScaleAllInOne: xAxisScale
                })

            }
    }, [activeSection, data?.showVelocityStd, data?.show95Percentile, index, screenWidth, data])

  return (
    <svg ref={svgRef} width={width ? width : graphWidth} height={height ? height : 500} id='all-in-one-graph'></svg>
  ) 
}

