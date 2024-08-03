import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as path from 'path'
import * as fs from 'fs'

async function getQuiverTest(PROJECT_CONFIG: ProjectConfig) {
    ipcMain.handle('get-quiver-test', async (_event, _args) => {
        const quiverTestPath = path.join(PROJECT_CONFIG.directory, 'results_test.json')

        try {
            const data = await fs.promises.readFile(quiverTestPath, 'utf-8')
            const { x, y, u, v, typevector } = JSON.parse(data)
            
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
)}

export { getQuiverTest }