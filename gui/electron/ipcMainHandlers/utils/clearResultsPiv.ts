import * as fs from 'fs'

async function clearResultsPiv(resultsPath: string, settingsPath: string) {
    const settings = await fs.promises.readFile(settingsPath, 'utf-8');
    const settingsParsed = JSON.parse(settings);

    if (settingsParsed.piv_results) {
        delete settingsParsed.piv_results;
    }

    await fs.promises.writeFile(settingsPath, JSON.stringify(settingsParsed, null, 4), 'utf-8');

    try {
        await fs.promises.unlink(resultsPath);
        console.log(`File ${resultsPath} was deleted successfully`);
    } catch (error) {
        console.error(`Error deleting file ${resultsPath}:`, error);
    }
}

export { clearResultsPiv }