interface Bathimetry{
    station: string;
    stage: string;
}

interface Limits {
    stations: string[];
    stages: number[];
    max: number;
    min: number;
}

function getBathimetryLimits( results: Bathimetry[]): Limits{
    const { stations, stages } = results.reduce((acc, { station, stage }) => {
        if (station && stage) {
            acc.stations.push(parseFloat(station).toFixed(2));
            acc.stages.push(parseFloat(stage));
        }
        return acc;
    }, { stations: [] as number[], stages: [] as number[] });
    const min = Math.min(...stages);
    let max;
    if (stages[0] >= stages[stages.length - 1]) {
        max = stages[stages.length - 1];
    } else {
        max = stages[0];
    }

    return {
        stations: stations,
        stages: stages,
        max: max,
        min: min
    };
}

export default getBathimetryLimits