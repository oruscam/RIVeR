import { SectionData } from "../store/section/types";
import { Point } from "../types";

export const adapterData = ( data: SectionData, x1Intersection: number ) => {
    const { distance, plus_std, minus_std, percentile_95th, percentile_5th, Q, Q_portion, check, activeMagnitude, interpolated} = data

    const newDistance = distance.map((d) => {
            return d + x1Intersection!
    });

    const newStreamwiseVelocityMagnitude = activeMagnitude

    const newQ = Q.map((d,i) => {
        if ( check[i] === false && interpolated === false ){
            return null
        } else {
            return d
        }
    })

    return {
        distance: newDistance,
        streamwise_velocity_magnitude: newStreamwiseVelocityMagnitude,
        plus_std,
        minus_std,
        percentile_95th,
        percentile_5th,
        Q: newQ,
        Q_portion: Q_portion,
    }
}

export const adapterBathimetry = (line: Point[], x1Intersection: number, x2Intersection:number, level: number): Point[] => {
    const newBathLine = line?.filter(d => d.y <= level! && d.x >= x1Intersection! && d.x <= x2Intersection!)

    newBathLine?.unshift({ x: x1Intersection!, y: level! })
    newBathLine?.push({ x: x2Intersection!, y: level! })

    return newBathLine
}

export const generateXAxisTicks = ( x1Intersection: number, x2Intersection: number, width: number ): number[] => {
    let step = 0;

    if (width < 10) {
        step = 2;
    } else if (width < 30) {
        step = 5;
    } else {
        step = 15;
    }

    const ticks: number[] = [];

    // Añadir x1Intersection al arreglo de ticks
    ticks.push(x1Intersection);

    // Generar los valores entre x1Intersection y x2Intersection
    for (let i = Math.ceil(x1Intersection / step) * step; i < x2Intersection; i += step) {
        if (Math.abs(i - x1Intersection) > 2 && Math.abs(i - x2Intersection) > 2) {
            ticks.push(i);
        }
    }

    // Añadir x2Intersection al arreglo de ticks
    ticks.push(x2Intersection);

    return ticks;
}

export const generateYAxisTicks = (array?: (number|null)[], min?: number, max?: number): number[] => {
    const minValue = min ? min : 0;
    const maxValue = max ? max : Math.max(...array!.filter((value): value is number => value !== null));

    const range = maxValue - minValue;
    const step = range / 4;

    const ticks = [minValue, minValue + step, minValue + 2 * step, minValue + 3 * step, maxValue]

    return ticks
}

