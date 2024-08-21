import { Section } from '../store/section/types';


/**
 * This file contains helper functions to load the project data from the projects file.
 * It is used in the useProjectSlice.ts file.
 */


/**
 * 
 * @param video_range - video data saved in the project file
 * @param dispatch - redux dispatch
 * @param setVideoParameters - redux action to set video parameters
 * @returns - void
 */

const onLoadVideoParameters = (video_range: VideoRange, dispatch: any, setVideoParameters: any) => {
    const { step, start, end } = video_range
    dispatch(setVideoParameters({
        step: step,
        startTime: (start / 30).toString(),
        endTime: (end / 30).toString(),
        startFrame: start,
        endFrame: end,
    }))
    return
}

/**
 * 
 * @param pixel_size - pixel size data saved in the project file
 * @param section - section to update
 * @param dispatch - redux dispatch
 * @param updateSection  - redux action to update section
 * @returns 
 */

const onLoadPixelSize = (pixel_size: pixel_size, section: Section, dispatch: any , updateSection: any) => {
    const { x1, y1, x2 , y2, rw_length, size, east1, east2, north1, north2 } = pixel_size

    dispatch(updateSection({
        ...section,
        pixelSize: {size, rw_length},
        realWorld: [{x: east1, y: north1}, {x: east2, y: north2}],
        points: [{x: x1, y: y1}, {x: x2, y: y2}],
        drawLine: true
    }))
    return 
}

/**
 * 
 * @param xsections - cross sections data saved in the project file
 * @param dispatch - redux dispatch
 * @param updateSection - redux action to update section
 * @param addSection - redux action to add section 
 * @param sections - sections state. By default we have pixel_size and CS_default_1. In the first lop on the xsections we update the CS_default_1 section. And then we add the rest of the sections.
 */

const onLoadCrossSections = (xsections: XSections, dispatch: any, updateSection: any, addSection: any, sections: any) => {
    let flag = true
    Object.entries(xsections).forEach(([key, value]: [string, XSectionValue]) => {
        const {rw_length, east_l, east_r, north_l, north_r, xl, xr, yl, yr } = value
        if ( flag ){
            flag = false
            dispatch(updateSection({
                ...sections[1],
                drawLine: true,
                points: [{x: xl, y: yl}, {x: xr, y: yr}],
                realWorld: [{x: east_l, y: north_l}, {x: east_r, y: north_r}],
                pixelSize: {size: 0, rw_length: rw_length},
            }))
        } else {
            dispatch(addSection({
                name: key,
                drawLine: true,
                points: [{x: xl, y: yl}, {x: xr, y: yr}],
                pixelSize: {size: 0, rw_length: rw_length},
                realWorld: [{x: east_l, y: north_l}, {x: east_r, y: north_r}],
                bathimetry: {
                    blob: '',
                    level: 0,
                    path: '',
                    name: ''
                }
            }))
        }
    })
}

interface pixel_size {
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rw_length: number,
    size: number,
    east1: number,
    east2: number,
    north1: number,
    north2: number
}

interface VideoRange {
    step: number,
    start: number,
    end: number
}

interface XSectionValue {
    rw_length: number,
    east_l: number,
    north_l: number,
    east_r: number,
    north_r: number,
    xl: number,
    yl: number,
    xr: number,
    yr: number,
    bath: string,
    level: number
}


interface XSections {
    [key: string]: XSectionValue
}

export { onLoadPixelSize, onLoadVideoParameters, onLoadCrossSections }