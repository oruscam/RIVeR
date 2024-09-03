import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import * as path from 'node:path'
import { executePythonShell } from "./utils/executePythonShell";


async function createMaskAndBbox(PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('create-mask-and-bbox', async (_event, args) => {
        console.log('create-mask-and-bbox')
        const { directory, framesPath, xsectionsPath, matrixPath } = PROJECT_CONFIG;
        const { height_roi } = args;
        
        const images = await fs.promises.readdir(framesPath)
        const firstFramePath = path.join(framesPath, images[0])
        
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

        console.log("create-mask-and-bbox-options")
        console.log(options)


        try {
            const { data } = await executePythonShell(options) as { data: { mask: [[]], bbox: [] } }
            
            const maskArrayPath = path.join(directory, 'mask.json')
            const bboxArrayPath = path.join(directory, 'bbox.json')
            const maskJson = JSON.stringify(data.mask, null, 4)
            const bboxJson = JSON.stringify(data.bbox, null, 4)
            
            await fs.promises.writeFile(maskArrayPath, maskJson, 'utf-8')
            await fs.promises.writeFile(bboxArrayPath, bboxJson, 'utf-8')

            PROJECT_CONFIG.bboxPath = bboxArrayPath
            PROJECT_CONFIG.maskPath = maskArrayPath 
            
            const maskPngPath = path.join('/@fs', directory, 'mask.png')
            return { maskPath: maskPngPath }
        } catch (error) {
            console.log("ERROR EN CREATE MASK AND BBOX")
            console.log(error)
        }
    }

)}

export { createMaskAndBbox }