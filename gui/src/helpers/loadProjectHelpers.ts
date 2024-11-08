import { Section } from '../store/section/types';
import { getBathimetryValues } from './getBathimetryValues';
import { ANALIZING_STEP_NUMBER, RESULTS_STEP_NUMBER } from '../constants/constants';


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

export const onLoadVideoParameters = (video_range: VideoRange, dispatch: any, setVideoParameters: any) => {
    const { step, start, end } = video_range
    dispatch(setVideoParameters({
        step: step,
        startTime: (start / 30).toFixed(4),
        endTime: (end / 30).toFixed(4),
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

export const onLoadPixelSize = (pixel_size: pixel_size, section: Section, dispatch: any , updateSection: any) => {
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
 * @param values - cross sections data saved in the project file
 * @param dispatch - redux dispatch
 * @param updateSection - redux action to update section
 * @param addSection - redux action to add section 
 * @param sections - sections state. By default we have pixel_size and CS_default_1. In the first lop on the xsections we update the CS_default_1 section. And then we add the rest of the sections.
 */

export const onLoadCrossSections = (values: XSections, dispatch: any, updateSection: any, addSection: any, sections: any, ipcRenderer: any) => {
    let flag = true
    let flagData = false
    Object.entries(values).forEach( async ([key, value]: [string, XSectionValue]) => {
        const { rw_length, xl, xr, yl, yr, dir_xl, dir_yl, dir_xr, dir_yr, dir_east_l, dir_east_r, dir_north_l, dir_north_r, bath, level, left_station, alpha, num_stations } = value
        
        const { id, east, north, distance, x, y, displacement_x, displacement_y, displacement_east, displacement_north, streamwise_east, streamwise_north, crosswise_east, crosswise_north, streamwise_magnitude, depth, check, W, A, Q, Q_portion, minus_std, plus_std, total_Q, measured_Q, interpolated_Q, total_A, total_W, max_depth, average_depth, mean_V, mean_Vs, displacement_x_streamwise, displacement_y_streamwise, filled_streamwise_magnitude, filled_crosswise_east, filled_crosswise_north, filled_streamwise_east, filled_streamwise_north, Q_minus_std, Q_plus_std, total_q_std, showPercentile, showVelocityStd, interpolated } = value
        
        let data = undefined
        
        if ( distance ){
            flagData = true
            data = {
                num_stations: num_stations,
                alpha: parseFloat(alpha.toFixed(2)),
                id: id,
                east: east,
                north: north,
                distance: distance,
                x: x,
                y: y,
                displacement_x: displacement_x,
                displacement_y: displacement_y,
                displacement_east: displacement_east,
                displacement_north: displacement_north,
                streamwise_east: streamwise_east,
                streamwise_north: streamwise_north,
                crosswise_east: crosswise_east,
                crosswise_north: crosswise_north,
                streamwise_magnitude: streamwise_magnitude,
                depth: depth,
                check: check,
                W: W,
                A: A,
                Q: Q,
                Q_portion: Q_portion,
                minus_std: minus_std,
                plus_std: plus_std,
                percentile_5th: value['5th_percentile'],
                percentile_95th: value['95th_percentile'],
                total_Q: parseFloat(total_Q.toFixed(2)),
                measured_Q: parseFloat(measured_Q?.toFixed(2)),
                interpolated_Q: parseFloat(interpolated_Q?.toFixed(2)),
                total_A: parseFloat(total_A.toFixed(2)),
                total_W: parseFloat(total_W.toFixed(2)),
                max_depth: max_depth,
                average_depth: average_depth,
                mean_V: mean_V,
                mean_Vs: mean_Vs,
                displacement_x_streamwise: displacement_x_streamwise,
                displacement_y_streamwise: displacement_y_streamwise,
                filled_streamwise_magnitude: filled_streamwise_magnitude,
                filled_streamwise_east: filled_streamwise_east,
                filled_streamwise_north: filled_streamwise_north,
                filled_crosswise_east: filled_crosswise_east,
                filled_crosswise_north: filled_crosswise_north,
                Q_minus_std: Q_minus_std,
                Q_plus_std: Q_plus_std,
                total_q_std: total_q_std,
                interpolated: interpolated,
                showVelocityStd: showVelocityStd,
                showPercentile: showPercentile,
            }
        }

        try {
            const result = await ipcRenderer.invoke('get-bathimetry', { path: bath })
            const { yMax, yMin, xMax, xMin, x1Intersection, width } = getBathimetryValues(result.line, level)
            
            if ( flag ){
                flag = false
                dispatch(updateSection({
                    ...sections[1],
                    name: key,
                    drawLine: true,
                    sectionPoints: [{x: xl, y: yl}, {x: xr, y: yr}],
                    dirPoints: [{ x: dir_xl, y: dir_yl }, { x: dir_xr, y: dir_yr}],
                    rwPoints: [{x: dir_east_l, y: dir_north_l}, {x: dir_east_r, y: dir_north_r}],
                    pixelSize: {size: 0, rw_length: rw_length},
                    bathimetry: {
                        width: width,
                        level: level,
                        line: result.line,
                        yMax: yMax,
                        yMin: yMin,
                        xMax: xMax,
                        xMin: xMin,
                        leftBank: left_station,
                        x1Intersection: x1Intersection,
                        path: bath,
                    },
                    alpha: alpha,
                    numStations: num_stations,
                    interpolated: interpolated,
                    data: data
                }))
            } else {
                dispatch(addSection({
                    name: key,
                    drawLine: true,
                    sectionPoints: [{x: xl, y: yl}, {x: xr, y: yr}],
                    dirPoints: [{ x: dir_xl, y: dir_yl }, { x: dir_xr, y: dir_yr}],
                    rwPoints: [{x: dir_east_l, y: dir_north_l}, {x: dir_east_r, y: dir_north_r}],
                    pixelSize: {size: 0, rw_length: rw_length},
                    bathimetry: {
                        width: width,
                        level: level,
                        line: result.line,
                        yMax: yMax,
                        yMin: yMin,
                        xMax: xMax,
                        xMin: xMin,
                        leftBank: left_station,
                        x1Intersection: x1Intersection,
                        path: bath
                    },
                    alpha: alpha,
                    numStations: num_stations,
                    interpolated: interpolated,
                    data: data
                }))
            }
        } catch (error) {
            console.log(error)
            
        }        
    })

    if( flagData ){
        return RESULTS_STEP_NUMBER
    } else {
        return ANALIZING_STEP_NUMBER
    }
}

export const onLoadProcessingForm = ( values: ProcessingValues, dispatch: any, updateForm: any ) => {
    const { artificial_seeding, clahe, clip_limit, grayscale, median_test_epsilon, median_test_filtering, median_test_threshold, remove_background, std_filtering, std_threshold, interrogation_area_1, interrogation_area_2, roi_height } = values

    dispatch(updateForm({
        artificialSeeding: artificial_seeding,
        clahe: clahe,
        clipLimit: clip_limit,
        grayscale: grayscale,
        medianTestEpsilon: median_test_epsilon,
        medianTestFiltering: median_test_filtering,
        medianTestThreshold: median_test_threshold,
        removeBackground: remove_background,
        stdFiltering: std_filtering,
        stdThreshold: std_threshold,
        step1: interrogation_area_1,
        step2: interrogation_area_2,
        heightRoi: roi_height
    }))

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
    dir_xl: number,
    dir_yl: number,
    dir_xr: number,
    dir_yr: number,
    dir_east_l: number,
    dir_north_l: number,
    dir_east_r: number,
    dir_north_r: number,
    bath: string,
    level: number,
    leftBank: number,
    alpha: number,
    num_stations: number
    id: number,
    east: number[],
    north: number[],
    distance: number[],
    x: number[],
    y: number[],
    displacement_x: number[],
    displacement_y: number[],
    displacement_east: number[],
    displacement_north: number[],
    streamwise_east: number[],
    streamwise_north: number[],
    crosswise_east: number[],
    crosswise_north: number[],
    streamwise_magnitude: number[],
    depth: number[],
    check: boolean[],
    W: number[],
    A: number[],
    Q: number[],
    Q_portion: number[],
    minus_std: number[],
    plus_std: number[],
    '5th_percentile': number[],
    '95th_percentile': number[],
    total_Q: number,
    measured_Q: number,
    interpolated_Q: number,
    total_A: number,
    total_W: number,
    max_depth: number,
    average_depth: number,
    mean_V: number,
    mean_Vs: number,
    displacement_x_streamwise: number[],
    displacement_y_streamwise: number[],
    filled_streamwise_magnitude: number[],
    filled_streamwise_east: number[],
    filled_streamwise_north: number[],
    filled_crosswise_east: number[],
    filled_crosswise_north: number[],
    Q_minus_std: number[],
    Q_plus_std: number[],
    total_q_std: number,
    interpolated: boolean,
    showVelocityStd: boolean,
    showPercentile: boolean
}

interface XSections {
    [key: string]: XSectionValue
}

interface ProcessingValues {
    artificial_seeding?: boolean,
    clahe?: boolean,
    clip_limit?: number,
    grayscale?: boolean,
    median_test_epsilon?: number,
    median_test_filtering?: boolean,
    median_test_threshold?: number,
    remove_background?: boolean,
    std_filtering?: boolean,
    std_threshold?: number,
    interrogation_area_1?: number,
    interrogation_area_2?: number,
    roi_height?: number
}
