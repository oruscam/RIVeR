import { Limits, Point } from "../types";

const getBathimetryLimitsY = (line: Point[]): Limits => {
    const { ys } = line.reduce((acc, { x, y }) => {
        if (x !== undefined && y !== undefined) {
            acc.xs.push(x);
            acc.ys.push(y);
        }
        return acc;
    }, { xs: [] as number[], ys: [] as number[] });
    const min = Math.min(...ys);
    let max;

    if (ys[0] >= ys[ys.length - 1]) {
        max = ys[ys.length - 1];
    } else {
        max = ys[0];
    }

    return {
        max: max,
        min: min
    };
}

const getBathimetryLimitsX = (line: Point[]): Limits => {
    const xs = line.map(point => point.x);
    const min = Math.min(...xs);
    const max = Math.max(...xs);

    return {
        max: max,
        min: min
    };
}

export const getIntersectionPoints = (data: Point[], level: number): Point[] => {
    let intersectionPoints: Point[] = [];
    for (let i = 0; i < data.length - 1; i++) {
        const currentPoint = data[i];
        const nextPoint = data[i + 1];
    
        // Verifica si el nivel está entre los puntos actuales y siguientes
        if ((currentPoint.y <= level && nextPoint.y >= level) || (currentPoint.y >= level && nextPoint.y <= level)) {
            // Interpolación lineal para encontrar la posición exacta de intersección
            const t = (level - currentPoint.y) / (nextPoint.y - currentPoint.y);
            const intersectX = currentPoint.x + t * (nextPoint.x - currentPoint.x);
            const newIntersection = { x: intersectX, y: level };
    
            // Verifica si el nuevo punto de intersección es diferente del último punto agregado
            if (intersectionPoints.length === 0 || (intersectionPoints.length > 0 && intersectionPoints[intersectionPoints.length - 1].x !== newIntersection.x)) {
                intersectionPoints.push(newIntersection);
            }
    
            // Si ya tenemos dos puntos de intersección, podemos salir del bucle
            if (intersectionPoints.length === 2) {
                break;
            }
        }
    }

    return intersectionPoints;
}

export const getBathimetryValues = ( line: Point[], level? : number ) => {
    const yLimits = getBathimetryLimitsY(line);
    const xLimits = getBathimetryLimitsX(line);

    const intersectionPoints = getIntersectionPoints(line, level ? level : yLimits.max);

    if ( intersectionPoints.length === 0 ){
        return {
            error: {
                message: 'bathimetryNotValid',
                value: level
            }
        }
    }

    const bathWidth = intersectionPoints[1].x - intersectionPoints[0].x;

    return {
        data: {
            xMin: xLimits.min,
            xMax: xLimits.max,
            yMin: yLimits.min,
            yMax: yLimits.max,
            level: level ? level : yLimits.max,
            x1Intersection: intersectionPoints[0].x,
            x2Intersection: intersectionPoints[1].x,
            width: bathWidth,
            leftBank: 0
        }
    };
}
