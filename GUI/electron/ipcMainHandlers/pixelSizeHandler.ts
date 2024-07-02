import { ipcMain } from "electron";
import * as fs from 'fs'

interface pixelSizeHandleArgs {
    pixelPoints: number[];
    rwPoints: number[];
    pixelSize: number;
    rw_length: number;
    directory: string;
}

export function pixelSizeHandler() {
    ipcMain.handle('pixel-size', async (_event, args: pixelSizeHandleArgs) => {
        console.log('En pixel-size event', args);
        
        const json = await fs.promises.readFile(args.directory + '/config.json', 'utf-8');
        const jsonParsed = JSON.parse(json);
        
        jsonParsed.pixel_size = {
            size: args.pixelSize,
            rw_length: args.rw_length,
            x1: args.pixelPoints[0],
            y1: args.pixelPoints[1],
            x2: args.pixelPoints[2],
            y2: args.pixelPoints[3],
            east1: args.rwPoints[0],
            north1: args.rwPoints[1],
            east2: args.rwPoints[2],
            north2: args.rwPoints[3]
        }


        // * Falta agregar la matriz de este modo. Dentro de la llamada a la cli
        // jsonParsed.pixel_size.H = {
        //     x: 1,
        //     z: 1
        // }


        const updatedContent = JSON.stringify(jsonParsed, null, 4);
        
        try {
            await fs.promises.writeFile(args.directory + '/config.json', updatedContent, 'utf-8');
            return 'Pixel size saved to config.json'
        } catch (error) {
            console.error('Error writing to file:', error);
        }

    })
}