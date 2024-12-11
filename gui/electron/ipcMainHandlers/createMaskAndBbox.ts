import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import * as path from 'node:path'
import { clearCrossSections } from "./utils/clearCrossSections";
import { clearResultsPiv } from "./utils/clearResultsPiv";

async function createMaskAndBbox(PROJECT_CONFIG: ProjectConfig, riverCli: Function) {
    ipcMain.handle('create-mask-and-bbox', async (_event, args) => {
        console.log('create-mask-and-bbox')
        const { directory, framesPath, xsectionsPath, matrixPath, resultsPath, settingsPath } = PROJECT_CONFIG;
        const { height_roi, data } = args;
        
        const images = await fs.promises.readdir(framesPath)
        const firstFramePath = path.join(framesPath, images[0])

        console.log(args)

        if ( data ){
            await clearCrossSections(xsectionsPath)
        }

        if ( resultsPath !== '' ){
            clearResultsPiv(resultsPath, settingsPath)
        }

        const options = [
            'create-mask-and-bbox',
            '--save-png-mask',
            '-w',
            directory,
            height_roi,
            firstFramePath,
            xsectionsPath,
            matrixPath
        ]  

        try {
            const { data, error } = await riverCli(options) as { data: { mask: [[]], bbox: [] }, error: { message: string } }
            
            if ( error.message ){
                throw new Error(error.message)
            }

            const maskArrayPath = path.join(directory, 'mask.json')
            const bboxArrayPath = path.join(directory, 'bbox.json')

            const maskJson = JSON.stringify(data.mask, null, 0)
            const bboxJson = JSON.stringify(data.bbox, null, 0)
                        
            await Promise.all([
                fs.promises.writeFile(maskArrayPath, maskJson),
                fs.promises.writeFile(bboxArrayPath, bboxJson)
            ])
            
            PROJECT_CONFIG.bboxPath = bboxArrayPath
            PROJECT_CONFIG.maskPath = maskArrayPath 
            
            const maskPngPath = path.join(directory, 'mask.png')
            return { maskPath: maskPngPath }
        } catch (error) {
            console.log("ERROR EN CREATE MASK AND BBOX")
            return {
                error: {
                    message: error.message,
                    type: 'create-mask-and-bbox'
                }
            }
        }
    }

)}

export { createMaskAndBbox }