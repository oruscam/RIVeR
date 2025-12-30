import exp from 'constants';
import * as fs from 'fs';

async function saveUserMasks(settingsPath: string, userMasks: { x:number, y:number, id: number }[][]){
    const settings = await fs.promises.readFile(settingsPath, 'utf-8');
    const settingsParsed = JSON.parse(settings);
    
    settingsParsed.user_masks = userMasks;

    await fs.promises.writeFile(settingsPath, JSON.stringify(settingsParsed, null, 2));
}

export { saveUserMasks };