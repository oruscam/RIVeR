interface Bathimetry{
    x: number;
    y: number;
}

interface Limits {
    max: number;
    min: number;
}

const getBathimetryLimits = ( results: Bathimetry[]): Limits => {
    console.log('bat linmitasd')
    const { xs, ys } = results.reduce((acc, { x, y }) => {
        if (x && y) {
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

export default getBathimetryLimits;