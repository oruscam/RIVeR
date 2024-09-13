import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import { executePythonShell, executePythonShell2 } from "./utils/executePythonShell";

async function getResultData(PROJECT_CONFIG: ProjectConfig){
    // ipcMain.handle('get-result-data', async (_event, _args) => {
    //     const filePath = '/home/tomy_ste/River/files/x_sections_complete.json'

    //     try {
    //         const data = await fs.promises.readFile(filePath, 'utf-8')
    //         const dataParsed = JSON.parse(data.replace(/\bNaN\b/g, "null"))

    //         return transformData(dataParsed)    
            
    //     } catch (error) {
    //         console.log(error)
    //     }
    // })
    ipcMain.handle('get-results-all', async (_event, args) => {
        console.log('get-results-all')
        const xSections = PROJECT_CONFIG.xsectionsPath;
        const transformationMatrix = PROJECT_CONFIG.matrixPath;
        const pivResults = PROJECT_CONFIG.resultsPath;

        const { step, fps } = args 
        
        const options = [
            'update-xsection',
            '--step',
            parseInt(step),
            '--fps',
            parseFloat(fps),
            '--id-section',
            0,
            xSections,
            pivResults,
            transformationMatrix,
        ]

        console.log(options)

        try {
            const data = await executePythonShell2(options) as any
            console.log(data)
        } catch (error) {
            console.log(error)
        }


    })
}

// const transformData = (data: any): Record<string, SectionData> => {
//     const result: Record<string, SectionData> = {};

//     for (const key in data) {
//         const section = data[key];
//         result[key] = {
//             num_stations: section.num_stations,
//             alpha: parseFloat(section.alpha.toFixed(2)),
//             id: section.id,
//             east: section.east,
//             north: section.north,
//             distance: section.distance,
//             x: section.x,
//             y: section.y,
//             displacement_x: section.displacement_x,
//             displacement_y: section.displacement_y,
//             displacement_east: section.displacement_east,
//             displacement_north: section.displacement_north,
//             streamwise_east: section.streamwise_east,
//             streamwise_north: section.streamwise_north,
//             crosswise_east: section.crosswise_east,
//             crosswise_north: section.crosswise_north,
//             streamwise_magnitude: section.streamwise_magnitude,
//             depth: section.depth,
//             check: section.check,
//             W: section.W,
//             A: section.A,
//             Q: section.Q,
//             Q_portion: section.Q_portion,
//             minus_std: section.minus_std,
//             plus_std: section.plus_std,
//             percentile_5th: section['5th_percentile'],
//             percentile_95th: section['95th_percentile'],
//             total_Q: parseFloat(section.total_Q.toFixed(2)),
//             measured_Q: parseFloat(section.measured_Q.toFixed(2)),
//             interpolated_Q: parseFloat(section.interpolated_Q.toFixed(2)),
//             total_A: parseFloat(section.total_A.toFixed(2)),
//             total_W: parseFloat(section.total_W.toFixed(2)),
//             max_depth: section.max_depth,
//             average_depth: section.average_depth,
//             mean_V: section.mean_V,
//             mean_Vs: section.mean_Vs,
//             displacement_x_streamwise: section.displacement_x_streamwise,
//             displacement_y_streamwise: section.displacement_y_streamwise,
//             filled_streamwise_magnitude: section.filled_streamwise_magnitude,
//             filled_streamwise_east: section.filled_streamwise_east,
//             filled_streamwise_north: section.filled_streamwise_north,
//             filled_crosswise_east: section.filled_crosswise_east,
//             filled_crosswise_north: section.filled_crosswise_north,
//             Q_minus_std: section.Q_minus_std,
//             Q_plus_std: section.Q_plus_std,
//             total_q_std: section.total_q_std,
//         };
//     }

//     return result;
// };

export { getResultData }



