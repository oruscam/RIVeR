import { Section } from "../store/section/types";

export const adapterCrossSections = ( sections: Section[] ) => {
    const transformSection = (section: Section) => {
        const { name, dirPoints, sectionPoints, bathimetry, pixelSize, numStations , alpha, rwPoints, sectionPointsRW } = section;
        
        if ( sectionPointsRW === undefined ) return
        return {
            [name]: {
                bath: bathimetry.path,
                rw_length: pixelSize.rwLength,
                level: bathimetry.level,
                left_station: bathimetry.leftBank,
                east_l: sectionPointsRW[0].x,
                north_l: sectionPointsRW[0].y,
                east_r: sectionPointsRW[1].x,
                north_r: sectionPointsRW[1].y,
                xl: sectionPoints[0].x,
                yl: sectionPoints[0].y,
                xr: sectionPoints[1].x,
                yr: sectionPoints[1].y,
                dir_east_l: rwPoints[0].x,
                dir_north_l: rwPoints[0].y,
                dir_east_r: rwPoints[1].x,
                dir_north_r: rwPoints[1].y,
                dir_xl: dirPoints[0].x,
                dir_yl: dirPoints[0].y,
                dir_xr: dirPoints[1].x,
                dir_yr: dirPoints[1].y,
                num_stations: numStations,
                alpha: alpha,
            }
        }
    }

    const jsonFormatSections = sections.slice(1).map(transformSection);

    return Object.assign({}, ...jsonFormatSections);
}