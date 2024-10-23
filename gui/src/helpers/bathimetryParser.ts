import { csv, tsv } from 'd3' 

const bathParser = async (path: string, type: string): Promise<{x: number, y: number}[]> => {
    let parser = csv;
    if(type === 'tsv'){
        parser = tsv;
    }


    try {
        const data = await parser(path);
        const processedData = data.map((d => {
            const columns = Object.keys(d);
            return {
                x: +d[columns[0]],
                y: +d[columns[1]]
            }
        })).filter(d => !isNaN(d.x) && !isNaN(d.y));

        if(processedData.length === 0){
            console.error('No se encontraron datos válidos en el archivo CSV.')
            return undefined;
        }

        return processedData;
    } catch (error) {
        console.log(error)
    }

    return undefined;
}

export default bathParser   