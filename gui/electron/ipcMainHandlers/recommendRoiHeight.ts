import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";

async function recommendRoiHeight(PROJECT_CONFIG: ProjectConfig, riverCli: Function) {
    ipcMain.handle('recommend-roi-height', async (_event, args?) => {
        console.log('recommend-roi-height')

        const { xsectionsPath, matrixPath } = PROJECT_CONFIG;
        const options = [
            'recommend-height-roi',
            args ? args : 128,
            xsectionsPath,
            matrixPath
        ]

        try {
            const { data } = await riverCli(options)
            return { height_roi: (data as any).height_roi }
        } catch (error) {
            console.log("ERROR EN RECOMMEND ROI HEIGHT")
            console.log(error)  
        }
    })
}


export { recommendRoiHeight }