import { useEffect, useRef } from 'react'
import './graphs.css'
import * as d3 from 'd3'
import { useSectionSlice, useUiSlice } from '../../hooks'
import { createDischargeChart } from './dischargeSvg'
import { createVelocityChart } from './velocitySvg'
import { bathimetrySvg } from './bathimetrySvg'
import { GRAPHS } from '../../constants/constants'
import { adapterBathimetry, adapterData } from '../../helpers'
import { generateXAxisTicks } from '../../helpers/graphsHelpers'

/**
 * * Version 0.0.1
 * * 
 * @returns 
 */

export const AllInOne = ({ width, height, index, isReport  } : {width?: number, height?: number, index?: number, isReport: boolean}) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { sections, activeSection } = useSectionSlice();
    const { data, bathimetry, name } = sections[index ? index : activeSection]
    const { level, x1Intersection, x2Intersection, width: bathWidth } = bathimetry
    const { screenSizes } = useUiSlice()
    const { width: screenWidth } = screenSizes

    const graphWidth = screenWidth * GRAPHS.WIDTH_PROPORTION > GRAPHS.MIN_WIDTH ? screenWidth * GRAPHS.WIDTH_PROPORTION : GRAPHS.MIN_WIDTH

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if(svgRef.current === null) return

            if(data){
                const svg = d3.select(svgRef.current)
                const width = +svg.attr('width')
                const height = +svg.attr('height')
                const margin = { top: 20, right: 30, bottom: 40, left: 50 }
                const graphHeight = (height) / 3
                
                const { distance, streamwise_velocity_magnitude, plus_std, minus_std, percentile_5th, percentile_95th, Q, Q_portion } = adapterData(data, x1Intersection!)
                const { showPercentile, showVelocityStd } = data
                
                const bathData = adapterBathimetry(bathimetry.line!, x1Intersection!, x2Intersection!, level!)

                // xScale for velocity and bathimetry
                
                const xScale = d3.scaleLinear()
                    .domain([x1Intersection!, x2Intersection!])
                    .range([margin.left + 30, width - margin.right - 30]) 

                // Common xAxis
                const ticks = generateXAxisTicks(x1Intersection!, x2Intersection!, bathWidth!);

                const xAxis = d3.axisBottom(xScale)
                    .tickValues(ticks)
                    .tickFormat(d3.format('.1f'))

                // Append xAxis

                svg.append('g')
                    .attr('transform', `translate(0,${height - margin.bottom - 10})`)
                    .call(xAxis)
                    .selectAll('.tick text')
                    .style('font-size', '14px')

                svg.selectAll('.tick line')
                    .attr('stroke', 'lightgrey')
                    .attr('stroke-width', 0.2);

                // Create xGrid common for all graphs, and add it

                const makeXGridlines = () => d3.axisBottom(xScale).tickValues(ticks);

                svg.append('g')
                    .attr('class', 'grid')
                    .attr('transform', `translate(0,${height - margin.bottom - 10})`)
                    .call(makeXGridlines()
                        .tickSize(-height + margin.top + margin.bottom)
                        .tickFormat('' as any))
                        .attr('stroke', 'grey')
                        .attr('stroke-width', 0.05);

                createDischargeChart({
                    SVGElement: svgRef.current,
                    xScale: xScale,
                    distance: distance,
                    Q: Q,
                    QPortion: Q_portion,
                    sizes: { width, height, margin, graphHeight },
                    isReport,
                });
                
                createVelocityChart({
                    SVGElement: svgRef.current,
                    xScale,
                    magnitude: streamwise_velocity_magnitude,
                    percentile5: percentile_5th,
                    percentile95: percentile_95th,
                    minusStd: minus_std,
                    plusStd: plus_std,
                    distance: distance,
                    interpolated: data.interpolated,
                    check: data.check,
                    sizes: { width, height, margin, graphHeight },
                    showPercentile: showPercentile,
                    showStd: showVelocityStd,
                    isReport
                });
                
                bathimetrySvg({
                    svgElement: svgRef.current,
                    data: bathData,
                    level,
                    showLeftBank: false,
                    sizes: { width, height, margin, graphHeight },
                    xScaleAllInOne: xScale,
                    isReport
                })

            }
    }, [activeSection, data?.showVelocityStd, data?.showPercentile, index, screenWidth, data?.Q, data?.check])

  return (
    <svg ref={svgRef} width={width ? width : graphWidth} height={height ? height : 500} id={`section-${name}`}></svg>
  ) 
}

