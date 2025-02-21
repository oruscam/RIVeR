import * as fs from 'fs'

async function clearCrossSections(filepath: string){
    const xSectionsFile = await fs.promises.readFile(filepath, 'utf-8')
    const data = JSON.parse(xSectionsFile)

    const basicKeys = [
        "bath",
        "rw_length",
        "level",
        "left_station",
        "east_l",
        "east_r",
        "north_l",
        "north_r",
        "xl",
        "yl",
        "xr",
        "yr",
        "dir_east_l",
        "dir_north_l",
        "dir_east_r",
        "dir_north_r",
        "dir_xl",
        "dir_yl",
        "dir_xr",
        "dir_yr",
        "num_stations",
        "alpha"
    ]
    
    const newJson = {}

    for ( const key in data ){
        if ( data.hasOwnProperty(key) ){
            const section = data[key]
            const newSection = {}
            for ( const basicKey of basicKeys ){
                newSection[basicKey] = section[basicKey]
            }
            newJson[key] = newSection
        }
    }

    delete newJson.summary
    console.log(newJson)
    await fs.promises.writeFile(filepath, JSON.stringify(newJson, null, 2 ), 'utf-8')
}

export { clearCrossSections }