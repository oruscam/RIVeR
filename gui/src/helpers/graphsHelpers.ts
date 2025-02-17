import { SectionData } from "../store/section/types";
import { Point } from "../types";

export const adapterData = (data: SectionData, x1Intersection: number, interpolated: boolean, artificialSeeding: boolean) => {
    const { distance, streamwise_velocity_magnitude, plus_std, minus_std, percentile_95th, percentile_5th, Q, Q_portion, filled_streamwise_velocity_magnitude, check, seeded_vel_profile, filled_seeded_vel_profile } = data

    const newDistance = distance.map((d) => {
            return d + x1Intersection!
    });

    const newStreamwiseVelocityMagnitude = streamwise_velocity_magnitude.map((d,i) => {
        if ( check[i] ){
            if ( artificialSeeding === false && interpolated === true && filled_streamwise_velocity_magnitude !== undefined ){
                console.log('using filled_streamwise_velocity_magnitude')
                return filled_streamwise_velocity_magnitude[i]
            }
            if ( artificialSeeding === true && interpolated === false && seeded_vel_profile !== undefined ){ 
                console.log('using seeded_vel_profile')
                return seeded_vel_profile[i]
            }
            if ( artificialSeeding === true && interpolated === true && filled_seeded_vel_profile !== undefined ){
                console.log('using filled_seeded_vel_profile')
                return filled_seeded_vel_profile[i]
            }
            if ( d === null ) return 0
            console.log('using streamwise_velocity_magnitude')
            return d
        } else {
            if ( interpolated === false && artificialSeeding === false ){
                return null
            } else {
                return d
            }
        }
    });

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

