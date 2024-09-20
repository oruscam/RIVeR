import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import { executePythonShell2 } from "./utils/executePythonShell";

async function getResultData(PROJECT_CONFIG: ProjectConfig){


    ipcMain.handle('get-results-single', async (_event, args) => {
        console.log('get-results-single')
        const { step, fps, sectionIndex, alpha, num_stations, interpolated, check, name } = args
        
        
        const xSections = PROJECT_CONFIG.xsectionsPath;
        const transformationMatrix = PROJECT_CONFIG.matrixPath;
        const pivResults = PROJECT_CONFIG.resultsPath;
    
        const xSectionsFile = await fs.promises.readFile(xSections, 'utf-8')
        const xSectionsFileParsed = JSON.parse(xSectionsFile)
        console.log(arraysAreEqual(xSectionsFileParsed[name].check, check))
        
        if( !arraysAreEqual(xSectionsFileParsed[name].check, check) ){
            xSectionsFileParsed[name].check = check
            await fs.promises.writeFile(xSections, JSON.stringify(xSectionsFileParsed, null, 2 ), 'utf-8')
        }


        console.log(xSectionsFileParsed[name].check)

        const options = [
            'update-xsection',
            '--step',
            parseInt(step),
            '--fps',
            parseFloat(fps),
            '--id-section',
            sectionIndex,
            '--alpha',
            alpha,
            '--num-stations',
            num_stations,
            interpolated ? '--interpolate' : '',
            xSections,
            pivResults,
            transformationMatrix,
        ].filter( value => value !== '')

        


        try {
            const result = await executePythonShell2(options) as any
            const parsedData = JSON.parse(result.replace(/\bNaN\b/g, "null"))
            const { data } = parsedData

            for (const sectionKey in data) {
                const section = data[sectionKey];
                xSectionsFileParsed[sectionKey] = section
            }
            await fs.promises.writeFile(xSections, JSON.stringify(xSectionsFileParsed, null, 2 ), 'utf-8')
            return transformData(data)    
            
        } catch (error) {
            console.log(error)
        }
    })

    ipcMain.handle('get-results-all', async (_event, args) => {
        console.log('get-results-all')
        const xSections = PROJECT_CONFIG.xsectionsPath;
        const transformationMatrix = PROJECT_CONFIG.matrixPath;
        const pivResults = PROJECT_CONFIG.resultsPath;
    
        const xSectionsFile = await fs.promises.readFile(xSections, 'utf-8')
        const xSectionsFileParsed = JSON.parse(xSectionsFile)

        let updatedSections = {}

        const { step, fps, numSections } = args 
        
        for (let i = 0; i < numSections; i++) {
            const options = [
                'update-xsection',
                '--step',
                parseInt(step),
                '--fps',
                parseFloat(fps),
                '--id-section',
                i,
                xSections,
                pivResults,
                transformationMatrix,
            ]

            try {
                const result = await executePythonShell2(options) as any
                const parsedData = JSON.parse(result.replace(/\bNaN\b/g, "null")) ;
                const { data } = parsedData
                
                for (const sectionKey in data) {
                    const sectionIndex = Object.keys(data).indexOf(sectionKey);
                    if ( sectionIndex === i ){
                        const section = data[sectionKey];
                        updatedSections[sectionKey] = section
                        xSectionsFileParsed[sectionKey] = section
                    }
                }


            } catch (error) {
                console.log(error)
            }
        }

        await fs.promises.writeFile(xSections, JSON.stringify(xSectionsFileParsed, null, 2 ), 'utf-8')

        return transformData(updatedSections)
        
    })
}

const transformData = (data: any): Record<string, SectionData> => {
    const result: Record<string, SectionData> = {};

    for (const key in data) {
        const section = data[key];
        result[key] = {
            num_stations: section.num_stations,
            alpha: parseFloat(section.alpha.toFixed(2)),
            id: section.id,
            east: section.east,
            north: section.north,
            distance: section.distance,
            x: section.x,
            y: section.y,
            displacement_x: section.displacement_x,
            displacement_y: section.displacement_y,
            displacement_east: section.displacement_east,
            displacement_north: section.displacement_north,
            streamwise_east: section.streamwise_east,
            streamwise_north: section.streamwise_north,
            crosswise_east: section.crosswise_east,
            crosswise_north: section.crosswise_north,
            streamwise_magnitude: section.streamwise_magnitude,
            depth: section.depth,
            check: section.check,
            W: section.W,
            A: section.A,
            Q: section.Q,
            Q_portion: section.Q_portion,
            minus_std: section.minus_std,
            plus_std: section.plus_std,
            percentile_5th: section['5th_percentile'],
            percentile_95th: section['95th_percentile'],
            total_Q: parseFloat(section.total_Q.toFixed(2)),
            measured_Q: parseFloat(section.measured_Q.toFixed(2)),
            interpolated_Q: parseFloat(section.interpolated_Q.toFixed(2)),
            total_A: parseFloat(section.total_A.toFixed(2)),
            total_W: parseFloat(section.total_W.toFixed(2)),
            max_depth: section.max_depth,
            average_depth: section.average_depth,
            mean_V: section.mean_V,
            mean_Vs: section.mean_Vs,
            displacement_x_streamwise: section.displacement_x_streamwise,
            displacement_y_streamwise: section.displacement_y_streamwise,
            filled_streamwise_magnitude: section.filled_streamwise_magnitude,
            filled_streamwise_east: section.filled_streamwise_east,
            filled_streamwise_north: section.filled_streamwise_north,
            filled_crosswise_east: section.filled_crosswise_east,
            filled_crosswise_north: section.filled_crosswise_north,
            Q_minus_std: section.Q_minus_std,
            Q_plus_std: section.Q_plus_std,
            total_q_std: section.total_q_std,
        };
    }

    return result;
};


function arraysAreEqual(arr1: boolean[], arr2: boolean[]): boolean {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}
export { getResultData }



