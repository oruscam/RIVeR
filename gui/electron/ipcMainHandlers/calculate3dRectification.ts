import { ipcMain } from "electron";
import { ProjectConfig } from "./interfaces";
import * as fs from 'fs'
import path from 'path';

async function calculate3dRectification(PROJECT_CONFIG: ProjectConfig, riverCli: Function) {
    ipcMain.handle('calculate-3d-rectification', async (_event, args) => {
        console.log('calculate-3d-rectification')

        const { directory, logsPath, settingsPath, firstFrame } = PROJECT_CONFIG
        const { points, mode, hemisphere } = args

        // settings file
        const settings = await fs.promises.readFile(settingsPath, 'utf-8');
        const settingsParsed = JSON.parse(settings);

        let flag = false
        let full_grp_3d = {}
        const full_grp_3d_path = path.join(directory, 'full_grp_3d.json')
        
        // grp file
        const jsonContent = points.reduce((acc: any, point: any, index: number) => {
            const { X, Y, Z, x, y, selected, label, image } = point

            if ( mode === 'direct-solve' && selected === false || x === 0 && y === 0 ) {
                acc.not_selected_X.push(X)
                acc.not_selected_Y.push(Y)
                acc.not_selected_Z.push(Z)
                acc.not_selected_label.push([label, index])
                acc.not_selected_x.push(x)
                acc.not_selected_y.push(y)
                acc.not_selected_image.push(image)
                flag = true
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
            not_selected_image: [],
        })

        jsonContent.solution = mode

        if ( flag ){            
          full_grp_3d = points.reduce((acc: any, point: any, index: number) => {
               const { X, Y, Z, x, y, selected, label, image } = point
    
               if ( x === 0 && y === 0 ) {
    
                   return 
               }
    
               acc.X.push(X)
               acc.Y.push(Y)
               acc.Z.push(Z)
               acc.x.push(x)
               acc.y.push(y)
    
               return acc
           }, { 
               X: [], 
               Y: [], 
               Z: [], 
               x: [], 
               y: [], 
    
           })
        }

        try {
            const filePath = path.join(directory, 'grp_3d.json')
            await fs.promises.writeFile(filePath, JSON.stringify(jsonContent, null, 2))
            if ( flag ) {
                await fs.promises.writeFile(full_grp_3d_path, JSON.stringify(full_grp_3d, null, 2))
            }
            console.log('File written successfully')

            const options = [
                'get-camera-solution',
                '--image-path',
                firstFrame,
                mode === 'optimize-solution' ? '--' + mode : undefined,
                '--' + hemisphere,
                flag ? ('--full-grp-dict') : undefined,
                flag ? full_grp_3d_path : undefined,
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
                    meanError: data.error,
                    uncertaintyEllipses: data.uncertainty_ellipses,
                    cameraMatrix: data.camera_matrix,
                    numPoints: data.num_points,
                    pointIndices: data.point_indices,
                }
            }
        } catch (error) {
            console.log(error)
            throw new Error(error)
        }
    })
    
}

export { calculate3dRectification }