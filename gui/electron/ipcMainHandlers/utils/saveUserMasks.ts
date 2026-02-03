import * as fs from 'fs';
import { PROJECT_CONFIG } from '../../main';
import * as path from 'path';

async function saveUserMasks(userMasks: { x:number, y:number, id: number }[][]){
    const { settingsPath, projectDirectory } = PROJECT_CONFIG;
    const settings = await fs.promises.readFile(settingsPath, 'utf-8');
    const settingsParsed = JSON.parse(settings);

    
    if ( userMasks.length === 0 ) {
        if (settingsParsed.user_masks) {
            const files =  await fs.promises.readdir(projectDirectory);

            for (const file of files) {
                if (file.startsWith('usr_mask') || file.startsWith('final_mask')) {
                    await fs.promises.unlink(path.join(projectDirectory, file));
                }
            }
        }
        delete settingsParsed.user_masks;
    } else {
        settingsParsed.user_masks = userMasks;
    }

    await fs.promises.writeFile(settingsPath, JSON.stringify(settingsParsed, null, 2));
}

export { saveUserMasks };