import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import { executePythonShell } from "./utils/executePythonShell";


export async function realWorldToPixel(PROJECT_CONFIG: ProjectConfig){
    ipcMain.handle('real-world-to-pixel', async (_event, args) => {
        console.log("Real World To Pixel")

        const options = [
            'transform-real-world-to-pixel',
            '--',
            args.points.x,
            args.points.y,
            PROJECT_CONFIG.matrixPath
        ]        
             
        try {
            const { data } = await executePythonShell(options) as any
            return data;
        } catch (error) {
            console.log("Error en real-world-to-pixel")
            console.log(error)
        }
        
    })
}

