import { ipcMain } from "electron";
import { FirstFrameArgs, ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import { executePythonShell } from "./utils/executePythonShell";

function firstFrame(PROJECT_CONFIG: ProjectConfig){

    ipcMain.handle('first-frame', async( _event, args: FirstFrameArgs) => {
        PROJECT_CONFIG.framesPath = PROJECT_CONFIG.directory + '/frames';
        const {videoPath, framesPath} = PROJECT_CONFIG


        const options = [
                'video-to-frames',
                videoPath,
                framesPath,
                '--start-frame', args.start_frame,
                '--end-frame', args.end_frame,
                '--every', args.step,
                '--overwrite'
            ]
        

        const json = await fs.promises.readFile(PROJECT_CONFIG.settingsPath, 'utf-8');
        const jsonParsed = JSON.parse(json);

        jsonParsed.video_range = {
            start: args.start_frame,
            end: args.end_frame,
            step: args.step
        }
        
        const updatedContent = JSON.stringify(jsonParsed, null, 4);
        await fs.promises.writeFile(PROJECT_CONFIG.settingsPath, updatedContent, 'utf-8');

        try {
            const { data } = await executePythonShell(options) as any
            return data
        } catch (error) {
            
        }
    }
)}

export { firstFrame }