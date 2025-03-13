import * as path from 'path'
import * as fs from 'fs'
import { ProjectConfig } from '../interfaces';

async function createMatrix( message: string, PROJECT_CONFIG: ProjectConfig, settings: any ): Promise<string>{
    const { directory, resultsPath, bboxPath, xsectionsPath, maskPath } = PROJECT_CONFIG;

    if ( settings.xsections ){
        delete settings.xsections
        try {
            await fs.promises.unlink(xsectionsPath)
        } catch (err) {
            console.log(`Error deleting xsectionsPath: ${err.message}`)
        }
        try {
            await fs.promises.unlink(bboxPath)
        } catch (err) {
            console.log(`Error deleting bboxPath: ${err.message}`)
        }
        try {
            await fs.promises.unlink(maskPath)
        } catch (err) {
            console.log(`Error deleting maskPath: ${err.message}`)
        }
    }

    if ( settings.piv_results ){
        delete settings.piv_results
        try {
            await fs.promises.unlink(resultsPath)
        } catch (err) {
            console.log(`Error deleting resultsPath: ${err.message}`)
        }
    }

    return new Promise((resolve, reject) => {
        const matrixPath = path.join(directory, 'transformation_matrix.json')

        fs.promises.writeFile(matrixPath, JSON.stringify(message), 'utf-8').then(() => {
            resolve(matrixPath)
        }).catch((err) => {
            console.log(err)
            reject("Error al crear uav_transformation_matrix.json")
        });
    })
}

export { createMatrix }