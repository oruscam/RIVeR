import * as fs from 'fs';
import * as path from 'path'


export async function createFolderStructure (newDirPath: string, type: string, videoPath: string) {

    try {
        await fs.promises.access(newDirPath, fs.constants.F_OK);
        console.log('Directory already exists:', newDirPath);
      } catch {
        try {
          await fs.promises.mkdir(newDirPath, { recursive: true });
          console.log('Directory created:', newDirPath);
        } catch (err) {
          console.error('Error creating directory:', err);
        }
      }

    const framePath = path.join(newDirPath, 'frames');
    try {
        await fs.promises.access(framePath, fs.constants.F_OK);
        console.log('Directory already exists:', framePath);
    } catch {
        try {
        await fs.promises.mkdir(framePath, { recursive: true });
        console.log('Directory created:', framePath);
        } catch (err) {
        console.error('Error creating directory:', err);
        }
    }

    const jsonPath = path.join(newDirPath, 'settings.json');
    const jsonData = {
        creation_date: getFormattedDate(),
        footage: type,
        filepath: videoPath,
    }

    try{
        await fs.promises.writeFile(jsonPath, JSON.stringify(jsonData), 'utf-8');
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