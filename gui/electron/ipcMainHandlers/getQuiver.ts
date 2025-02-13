import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import { readResultsPiv } from "./utils/readResultsPiv";
import * as fs from 'fs' 
import * as path from 'path'
import { clearResultsPiv } from "./utils/clearResultsPiv";


async function getQuiver(PROJECT_CONFIG: ProjectConfig, riverCli: Function) {
    ipcMain.handle('get-quiver-test', async (_event, args) => {
        const { resultsPath, settingsPath, logsPath } = PROJECT_CONFIG
        
        const { framesToTest, formValues } = args
        const filePrefix = import.meta.env.VITE_FILE_PREFIX

        await clearResultsPiv(resultsPath, settingsPath)

        let frames = []


        if ( filePrefix === '/@fs'){
            frames = framesToTest.map((frame: string) => {
                return frame.replace(filePrefix, '')
            })
        } else if ( filePrefix === 'file:\\\\'){
            frames = framesToTest.map((frame: string) => {
                return frame.replace(/file:\\/g, ''); // Use a regular expression to replace the prefix
              })
        } else {
            frames = framesToTest
        }

        const options = await createOptions('test', PROJECT_CONFIG, frames, formValues)
        try {
            const result = await riverCli(options, 'text', false, logsPath) as any;
            return result

        } catch (error) {
            console.log("Error en get-quiver-test")
            console.log(error)
            throw error
            }
        }
    )

    ipcMain.handle('get-quiver-all', async (_event, args) => {
        const { formValues } = args
        const { settingsPath, logsPath } = PROJECT_CONFIG    
        
        const options = await createOptions('all', PROJECT_CONFIG, [], formValues)

        try {
            const { data, error } = await riverCli(options, 'text', true, logsPath) as any;
            
            if ( error.message ){
                return {
                    error
                }
            }

            const { results_path } = data
            PROJECT_CONFIG.resultsPath = results_path

            const dataQuiver = await readResultsPiv(results_path)
            
            const settings = await fs.promises.readFile(settingsPath, 'utf-8');
            const settingsParsed = JSON.parse(settings);
            settingsParsed.piv_results = path.join(PROJECT_CONFIG.directory, 'piv_results.json');
            await fs.promises.writeFile(settingsPath, JSON.stringify(settingsParsed, null, 2));

            return {
                data: dataQuiver,
                error: ''
            }

        } catch (error) {
            console.log("Error en get-quiver-all")
            console.log(error)
            throw error   
        }
    })
}

async function createOptions(mode: string, PROJECT_CONFIG: ProjectConfig, framesToTest: string[], formValues: any) {
    const { bboxPath, maskPath, directory, framesPath, settingsPath } = PROJECT_CONFIG;
    const { artificialSeeding, clahe, clipLimit, grayscale, medianTestEpsilon, medianTestFiltering, medianTestThreshold, removeBackground, stdFiltering, stdThreshold, step1, step2,heightRoi } = formValues;

    const settings = await fs.promises.readFile(settingsPath, 'utf-8');
    const settingsParsed = JSON.parse(settings);


    settingsParsed.processing = {
        artificial_seeding: artificialSeeding,
        interrogation_area_1: step1,
        interrogation_area_2: step2,
        roi_height: heightRoi,
        grayscale: grayscale,
        remove_background: removeBackground,
        clahe: clahe,
        clip_limit: clipLimit,
        std_filtering: stdFiltering,
        std_threshold: stdThreshold,
        median_test_filtering: medianTestFiltering,
        median_test_epsilon: medianTestEpsilon,
        median_test_threshold: medianTestThreshold,
    };

    await fs.promises.writeFile(settingsPath, JSON.stringify(settingsParsed, null, 2));

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
        // artificialSeeding ? '' : '--no-seeding-filter',
        mode === 'test' ? framesToTest[0] : framesPath,
        mode === 'test' ? framesToTest[1] : ''
    ];

    return options.filter(item => item !== '');
}

export { getQuiver }