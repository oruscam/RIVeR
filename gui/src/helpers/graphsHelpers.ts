import { SectionData } from "../store/section/types";
import { Point } from "../types";

export const adapterData = (data: SectionData, x1Intersection: number) => {
    const { distance, streamwise_velocity_magnitude, plus_std, minus_std, percentile_95th, percentile_5th, Q, Q_portion } = data

    const distanceDischarge = distance.map((d, i ) => {
        if ( Q[i] === null ) {
            return null;
        } else { 
            return d + x1Intersection!
        }
    }).filter(d => d !== null);

    const distanceVelocity = distance.map((d, i ) => {
        if ( streamwise_velocity_magnitude[i] === null ) {
            return null;
        } else { 
            return d + x1Intersection!
        }
    }).filter(d => d !== null);

    const filteredStreamwiseMagnitude = streamwise_velocity_magnitude.filter(d => d !== null);
    const filteredPlusStd = plus_std.filter(d => d === null ? 0 : d);
    const filteredMinusStd = minus_std.filter(d => d === null ? 0 : d);
    const filteredPercentile_95th = percentile_95th.filter(d => d === null ? 0 : d);
    const filteredPercentile_5th = percentile_5th.filter(d => d === null ? 0 : d);
    const filteredQ = Q.filter(d => d !== null);
    const filteredQPortion = Q_portion.filter(d => d !== null );


    return {
        distanceDischarge: distanceDischarge,
        distanceVelocity: distanceVelocity,
        streamwise_velocity_magnitude: filteredStreamwiseMagnitude,
        plus_std: filteredPlusStd,
        minus_std: filteredMinusStd,
        percentile_95th: filteredPercentile_95th,
        percentile_5th: filteredPercentile_5th,
        Q: filteredQ,
        Q_portion: filteredQPortion,
    }
}

export const adapterBathimetry = (line: Point[], x1Intersection: number, x2Intersection:number, level: number): Point[] => {
    const newBathLine = line?.filter(d => d.y <= level! && d.x >= x1Intersection! && d.x <= x2Intersection!)

    newBathLine?.unshift({ x: x1Intersection!, y: level! })
    newBathLine?.push({ x: x2Intersection!, y: level! })

    return newBathLine
}

export const generateXAxisTicks = (distance: number[], x1Intersection: number, x2Intersection: number): number[] => {
    const arrayLength = distance.length;
    const firstQuarterIndex = Math.floor(arrayLength * 0.25);
    const halfIndex = Math.floor(arrayLength * 0.5);
    const thirdQuarterIndex = Math.floor(arrayLength * 0.75);

    const firstQuarter = distance[firstQuarterIndex];
    const half = distance[halfIndex];
    const thirdQuarter = distance[thirdQuarterIndex];

    return [x1Intersection, firstQuarter, half, thirdQuarter, x2Intersection]
}

export const generateYAxisTicks = (array?: number[], min?: number, max?: number): number[] => {
    const minValue = min ? min : 0;
    const maxValue = max ? max : Math.max(...array!);

    const range = maxValue - minValue;
    const step = range / 4;

    const ticks = [minValue, minValue + step, minValue + 2 * step, minValue + 3 * step, maxValue]

    return ticks
}