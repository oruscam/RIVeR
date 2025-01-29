import { useEffect, useRef } from "react"
import { useMatrixSlice, useUiSlice } from "../../hooks"
import { GRAPHS } from "../../constants/constants"
import * as d3 from 'd3';
import { pointsMapSvg } from "./pointsMapSvg";

// Provisional
import ipcam_image from '../../assets/ipcam-image.png'

// Provisional 
const camera_position =  [
    4388340.960884979, // x
    6523895.429188258, // y
    482.2791931302911 // z
]

// Provisional 
const ortho_extent = [
    4388416.013242501, // x_min
    4388535.654907499, // x_max
    6523931.195152501,  // y_min
    6524052.6328975 // y_max
]

export const PointsMap = () => {
    const svgRef = useRef(null)
    const { screenSizes } = useUiSlice()
    const { ipcam } = useMatrixSlice()
    const { importedPoints, activePoint } = ipcam

    const { width: screenWidth } = screenSizes

    const graphWidth = screenWidth * GRAPHS.IPCAM_GRID_PROPORTION > GRAPHS.MIN_WIDTH ? screenWidth * GRAPHS.IPCAM_GRID_PROPORTION : GRAPHS.MIN_WIDTH
    
    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if (importedPoints && svgRef.current) {
            pointsMapSvg({
                svgElement: svgRef.current,
                importedPoints,
                activePoint,
                ipcam_image: ipcam_image,
                camera_position: camera_position,
                ortho_extent: ortho_extent

            })
        }

    }, [importedPoints, graphWidth])

    return (
        <div>
            {
                importedPoints && (<svg ref={svgRef} width={graphWidth} height={graphWidth} style={{
                    'backgroundColor' : 'transparent',
                }}/>)
            }
        </div>
    )
}