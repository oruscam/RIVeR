import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import path from 'path';

async function calculate3dRectification(PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('calculate-3d-rectification', async (_event, args) => {
        console.log('calculate-3d-rectification')

        const { directory } = PROJECT_CONFIG

        const { points, type } = args

        const newPoints = points.map((point: any) => {
            const { label, X, Y, Z, x, y, selected } = point

            if ( type === 'direct-solve' && selected === false){
                return 
            }

            return {
                label,
                X,
                Y,
                Z,
                x,
                y
            }
        }).filter((point: any) => point !== undefined)

        const jsonContent = {
            points: newPoints,
            hemisphere: 'south',
        }

        try {
            const filePath = path.join(directory, 'grp_3d.json')
            await fs.promises.writeFile(filePath, JSON.stringify(jsonContent, null, 2))
            console.log('File written successfully')
            
        } catch (error) {
            console.log('Error writing file', error)
        }
    })
    
}




export { calculate3dRectification }