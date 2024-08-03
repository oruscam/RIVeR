import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import { executePythonShell } from "./utils/executePythonShell";

async function recommendRoiHeight(PROJECT_CONFIG: ProjectConfig){
    ipcMain.handle('recommend-roi-height', async (_event, args?) => {
        console.log('recommend-roi-height')
        const { xsectionsPath, matrixPath } = PROJECT_CONFIG;
        const options = [
            'recommend-height-roi',
            args ? args : 128,
            xsectionsPath,
            matrixPath
        ]
        console.log("recommend-roi-options")
        console.log(options)


        try {
            const { data }: { data: any } = await executePythonShell(options)
            return { height_roi: (data as any).height_roi }
        } catch (error) {
            console.log("ERROR EN RECOMMEND ROI HEIGHT")
            console.log(error)  
        }

    })
}


export { recommendRoiHeight }