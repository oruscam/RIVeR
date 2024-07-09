import { ipcMain } from "electron";
import * as path from 'node:path'
import * as fs from 'fs'

interface setSectionsHandleArgs {
    projectDirectory: string,
    data: any
}

export function setSections(){
    ipcMain.handle('set-sections', async (_event, args: setSectionsHandleArgs) => {
        const file = path.join(args.projectDirectory, 'config.json')
        
        const json = await fs.promises.readFile(file, 'utf-8')
        const jsonParsed = JSON.parse(json)
        jsonParsed.x_sections = args.data;
        
        const updatedContent = JSON.stringify(jsonParsed, null, 4)
        try {
            await fs.promises.writeFile(file, updatedContent, 'utf-8')
            return "Sections saved"
        } catch(error){
            console.log("ERROR ESCRIBIENDO JSON DE SECCIONES")
            console.log(error)
            return "Error saving sections"
        }
    }
    )
}