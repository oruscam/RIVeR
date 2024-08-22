import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as path from 'path'
import * as fs from 'fs'

async function getQuiver(PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('get-quiver-test', async (_event, _args) => {
        console.log("get-quiver-test")
        const quiverTestPath = path.join(PROJECT_CONFIG.directory, 'results_test.json')

        try {
            const data = await fs.promises.readFile(quiverTestPath, 'utf-8')
            const { x, y, u, v, typevector } = JSON.parse(data.replace(/\bNaN\b/g, "null"))

            return {
                x,
                y,
                u,
                v,
                typevector: typevector[0]
            }

        } catch (error) {
            console.log("Error en getQuiverTest")
            console.log(error)
        }
        }
    )

    ipcMain.handle('get-quiver-all', async (_event, _args) => {
        console.log("get-quiver-all")
        const quiverAllPath = path.join(PROJECT_CONFIG.directory, 'results_600.json')

        try {
            const data = await fs.promises.readFile(quiverAllPath, 'utf-8')
            const { x, y, u, v, typevector, v_median, u_median } = JSON.parse(data.replace(/\bNaN\b/g, "null")) 
            
            return {
                x,
                y,
                u,
                v,
                typevector: typevector[0],
                v_median,
                u_median
            }

        } catch (error) {
            console.log("Error en getQuiverAll")
            console.log(error)
        }

    })

}

export { getQuiver }
