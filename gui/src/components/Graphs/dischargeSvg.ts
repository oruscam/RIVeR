import * as d3 from 'd3'
import { BAR_PADDING, GREEN, RED, YELLOW } from '../../constants/constants';

interface CreateDischargeChartProps {
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
    distance: number[],
    Q: number[],
    QPortion: number[],
    isReport?: boolean
}

export const createDischargeChart = ({ SVGElement, distance, Q, QPortion, sizes, isReport = false} : CreateDischargeChartProps) => {
    const svg = d3.select(SVGElement);
    const { width, margin, graphHeight } = sizes;

    const xScale = d3.scaleBand<number>()
        .domain(distance)
        .range([margin.left, width - margin.right])
        .padding(BAR_PADDING);

    const yScale = d3.scaleLinear()
        .domain([d3.min(Q)!, d3.max(Q)!])
        .range([graphHeight, margin.top + (isReport ? 20 : 0)]);
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickPadding(4);
    
    svg.append('g')
        .attr('class', 'y-axis y-axis-1')
        .attr('transform', `translate(${margin.left},0)`)
        .call(yAxis)

    // Append Bars

    svg.selectAll(".bar")
        .data(Q)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (_d, i) => xScale(distance[i])!)
        .attr("y", d => yScale(Math.max(0, d))) // Ajustar para valores negativos
        .attr("height", d => Math.abs(yScale(d) - yScale(0))) // Ajustar la altura de las barras
        .attr("width", xScale.bandwidth())
        .attr("fill", (_d, i) => {
            if ( QPortion[i] < 0.05) {
                return GREEN;
            } else if (QPortion[i] < 0.1) {
                return YELLOW;
            } else  {
                return RED;
            }
        });

    

    if ( isReport ){

        // Add leyends

        const legendGroup = svg.append('g')
            .attr('class', 'legend-group')
            .attr('transform', `translate(${ margin.left + 40 }, ${margin.top})`);

        legendGroup.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', GREEN);
        
        legendGroup.append('text')
            .attr('x', 20)
            .attr('y', 12)
            .attr('fill', 'white')
            .text('Q < 5%');
        
        legendGroup.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('x', 90)
            .attr('fill', YELLOW);
        
        legendGroup.append('text')
            .attr('x', 110)
            .attr('y', 12)
            .attr('fill', 'white')
            .text('5% < Q < 10%');

        legendGroup.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('x', 220)
            .attr('fill', RED);
        
        legendGroup.append('text')
            .attr('x', 240)
            .attr('y', 12)
            .attr('fill', 'white')
            .text('Q > 10%');
    } else {         
    
        // Add tooltip to bars

        svg.selectAll(".bar")
        .on("mouseover", (event, d) => {
            svg.append("text")
                .attr("class", "tooltip")
                .attr("x", parseFloat(d3.select(event.currentTarget).attr("x")) + xScale.bandwidth() / 2)
                .attr("y", parseFloat(d3.select(event.currentTarget).attr("y")) - 5)
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .text(d.toFixed(2));
        })
        .on("mouseout", () => {
            svg.selectAll(".tooltip").remove();
        });
    }

    
        

    // Label
    
    svg.append('text')
        .attr('class', 'y-axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', - graphHeight + 60)
        .attr('y', margin.left - 35)
        .attr('transform', 'rotate(-90)')
        .attr('fill', 'white')
        .attr('font-size', '20px')

        .text('Discharge');

    }