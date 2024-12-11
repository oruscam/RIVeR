import { BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path'



async function createFolderStructure (newDirPath: string, type: string, videoPath: string, videoName: string,  result: { width: number; height: number; fps: number; duration: string }) {

    try {
      await fs.promises.access(newDirPath, fs.constants.F_OK);
      const mainWindow = BrowserWindow.getFocusedWindow();
      const { response } = await dialog.showMessageBox(mainWindow,{
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        title: 'Confirm',
        message: 'The directory already exists. Do you want to continue? This will overwrite the existing directory.',
        icon: '../../src/assets/icons/icon.ico'
        });

      if (response === 0) {
        try {
          await fs.promises.rm(newDirPath, { recursive: true, force: true });
          console.log('Directory removed:', newDirPath);
        } catch (err) {
          console.error('Error removing directory:', err);
          throw err; // Re-throw the error to cancel the operation
        }
      } else {
        const error = new Error('user-cancel-operation');
        throw error
      }
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('Directory does not exist, proceeding to create:', newDirPath);
      } else {
        console.error('Error accessing directory:', err);
        throw err; // Re-throw the error to cancel the operation
      }
    }

    try {
      await fs.promises.mkdir(newDirPath, { recursive: true });
      console.log('Directory created:', newDirPath);
    } catch (err) {
      console.error('Error creating directory:', err);
      throw err; // Re-throw the error to cancel the operation
    }

    const framePath = path.join(newDirPath, 'frames');
    
    try {
      await fs.promises.mkdir(framePath, { recursive: true });
      console.log('Directory created:', framePath);
    } catch (err) {
      console.error('Error creating directory:', err);
    }

    
    const jsonPath = path.join(newDirPath, 'settings.json');
    const jsonData = {
        creation_date: getFormattedDate(),
        footage: type,
        video: {
          filepath: videoPath,
          name: videoName,
          total_length: result.duration,
          time_between_frames: parseFloat((1 / result.fps).toFixed(2)),
          fps: result.fps,
          resolution : {
              width: result.width,
              height: result.height
          },
        }
    }

    try{
        await fs.promises.writeFile(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(jsonPath, 'created')
    }catch (err){
       console.error('Error creating json file:', err);
    }

    return newDirPath;
}

// * Helper function to get the current date and time in a formatted string. format is YYYYMMDDTHHMM. 

function getFormattedDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}`;
}

export { createFolderStructure}