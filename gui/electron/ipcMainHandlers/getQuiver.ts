import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import { executePythonShell } from "./utils/executePythonShell";
import { FormProcessing } from "../../src/store/data/types";


async function getQuiver(PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('get-quiver-test', async (_event, args) => {
        const { framesToTest, formValues } = args

        console.log(formValues)
        
        const options = createOptions('test', PROJECT_CONFIG, framesToTest, formValues)
        console.log(options)

        try {
            const result = await executePythonShell(options) as any;
            
            return result
        } catch (error) {
            console.log("Error en getQuiverTest")
            console.log(error)
            throw error
            }
        }
    )

    ipcMain.handle('get-quiver-all', async (_event, args) => {
        const { formValues } = args
        
        const options = createOptions('all', PROJECT_CONFIG, [], formValues)
        console.log(options)

        try {
            const { data, error } = await executePythonShell(options) as any;
            const { results_path } = data
            PROJECT_CONFIG.resultsPath = results_path

            const dataQuiver = await fs.promises.readFile(results_path, 'utf-8')
            const { x, y, u, v, typevector, v_median, u_median } = JSON.parse(dataQuiver.replace(/\bNaN\b/g, "null")) 
            
            return {
                data: {
                    x: x,
                    y: y,
                    u: u,
                    v: v,
                    typevector: typevector[0],
                    u_median: u_median,
                    v_median: v_median
                },
                error: error
            }
        } catch (error) {
            console.log("Error en get-quiver-all")
            console.log(error)
            throw error   
        }

    })

}


function createOptions(mode: string, PROJECT_CONFIG: ProjectConfig, framesToTest: string[], formValues: FormProcessing) {
    const { bboxPath, maskPath, directory, framesPath } = PROJECT_CONFIG;
    const { artificialSeeding, clahe, clipLimit, grayscale, medianTestEpsilon, medianTestFiltering, medianTestThreshold, removeBackground, stdFiltering, stdThreshold, step1, step2 } = formValues;

    const options = [
        mode === 'test' ? 'piv-test' : 'piv-analyze',
        mode !== 'test' ? '--workdir' : '',
        mode !== 'test' ? directory : '',
        '--bbox', bboxPath,
        '--mask', maskPath,
        '--interrogation-area-1', step1,
        '--interrogation-area-2', step1 / 2,
        stdFiltering ? '--standard-threshold' : '--no-standard-filter',
        stdFiltering ? stdThreshold : '',
        medianTestFiltering ? '--epsilon' : '--no-median-test-filter',
        medianTestFiltering ? medianTestEpsilon : '',
        medianTestFiltering ? '--threshold' : '',
        medianTestFiltering ? medianTestThreshold : '',
        clahe ? '--clip-limit-clahe' : '--no-filter-clahe',
        clahe ? clipLimit : '',
        grayscale ? '' : '--no-filter-grayscale',
        removeBackground ? '--filter-sub-background' : '',
        artificialSeeding ? '' : '--no-seeding-filter',
        mode === 'test' ? framesToTest[0] : framesPath,
        mode === 'test' ? framesToTest[1] : ''
    ];

    return options.filter(item => item !== '');
}

export { getQuiver }
