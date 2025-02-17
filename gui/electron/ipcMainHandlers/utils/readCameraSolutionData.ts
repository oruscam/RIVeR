import * as fs from 'fs'
import * as path from 'path'

async function readCameraSolutionData(directory: string) {
    const pointsPath = path.join(directory, 'grp_3d.json')
    const settingsPath = path.join(directory, 'camera')
    const solutionPath = 'camera_solution_3d.json'
    

}