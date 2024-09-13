import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import { executePythonShell } from "./utils/executePythonShell";

async function pixelToRealWorld(PROJECT_CONFIG: ProjectConfig){
    ipcMain.handle('pixel-to-real-world', async (_event, args) => {
        console.log("Pixel to Real World")
        
        const options = [
            'transform-pixel-to-real-world',
            '--',
            args.points.x,
            args.points.y,
            PROJECT_CONFIG.matrixPath
        ]
            
        try {
            const { data } = await executePythonShell(options) as any
            return data;

        } catch (error) {
            console.log("Error en pixel-to-real-world")
            console.log(error)
        }
    })
}

export { pixelToRealWorld }