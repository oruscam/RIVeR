import * as path from 'path'
import * as fs from 'fs'

function createMatrix( message: string, directory: string ): Promise<string>{
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