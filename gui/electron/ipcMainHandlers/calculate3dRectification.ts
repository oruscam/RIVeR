import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import path from 'path';

async function calculate3dRectification(PROJECT_CONFIG: ProjectConfig, riverCli: Function) {
    ipcMain.handle('calculate-3d-rectification', async (_event, args) => {
        console.log('calculate-3d-rectification')

        const { directory, framesPath, logsPath, settingsPath } = PROJECT_CONFIG
        const { points, type, hemisphere } = args

        const images = await fs.promises.readdir(framesPath)
        const firstFramePath = path.join(framesPath, images[0])

        // settings file
        const settings = await fs.promises.readFile(settingsPath, 'utf-8');
        const settingsParsed = JSON.parse(settings);

        // grp file
        const jsonContent = points.reduce((acc: any, point: any, index: number) => {
            const { X, Y, Z, x, y, selected, label, image } = point

            if (type === 'direct-solve' && selected === false || x === 0 && y === 0) {
                acc.not_selected_X.push(X)
                acc.not_selected_Y.push(Y)
                acc.not_selected_Z.push(Z)
                acc.not_selected_label.push([label, index])
                acc.not_selected_x.push(x)
                acc.not_selected_y.push(y)
                acc.not_selected_image.push(image)
                return acc
            }

            acc.X.push(X)
            acc.Y.push(Y)
            acc.Z.push(Z)
            acc.x.push(x)
            acc.y.push(y)
            acc.label.push([label, index])
            acc.image.push(image)

            return acc
        }, { 
            X: [], 
            Y: [], 
            Z: [], 
            x: [], 
            y: [], 
            label: [], 
            image: [],
            not_selected_X: [], 
            not_selected_Y: [], 
            not_selected_Z: [],
            not_selected_x: [],
            not_selected_y: [],
            not_selected_label: [],
            not_selected_image: []
        })

        jsonContent.solution = type
        try {
            const filePath = path.join(directory, 'grp_3d.json')
            await fs.promises.writeFile(filePath, JSON.stringify(jsonContent, null, 2))
            console.log('File written successfully')

            const options = [
                'get-camera-solution',
                '--image-path',
                firstFramePath,
                type === 'optimize-solution' ? '--' + type : undefined,
                '--' + hemisphere,
                '-w',
                directory,
                filePath,
            ].filter((value) => value !== undefined)

            const { data, error } = await riverCli(options, 'json', false, logsPath)

            if ( error.message ){
                return {
                    error: error.message
                }
            }

            console.log(options)

            // Save the results on camera_solution_3d.json
            const solution_path = path.join(directory, 'camera_solution_3d.json')
            const solutionParsed = JSON.stringify(data, null, 4);
            await fs.promises.writeFile(solution_path, solutionParsed, 'utf-8')

            settingsParsed.grp_3d = filePath
            settingsParsed.hemisphere = hemisphere
            settingsParsed.camera_solution_3d = solution_path

            const updatedContent = JSON.stringify(settingsParsed, null, 4);
            await fs.promises.writeFile(settingsPath, updatedContent, 'utf-8');
            
            return {
                data: {
                    orthoImagePath: data.ortho_image_path,
                    orthoExtent: data.ortho_extent,
                    cameraPosition: data.camera_position,
                    reprojectionErrors: data.reprojection_errors,
                    projectedPoints: data.projected_points,
                    meanError: data.mean_error,
                    uncertaintyEllipses: data.uncertainty_ellipses,
                    cameraMatrix: data.camera_matrix
                }
            }
        } catch (error) {
            return { error }
        }
    })
    
}




export { calculate3dRectification }