import { useEffect, useRef } from "react"
import { factor } from "../../types"
import { useMatrixSlice, useProjectSlice } from "../../hooks"
import { REPORT_IMAGES } from "../../constants/constants"
import * as d3 from 'd3';
import { ipcamSvg } from "../Graphs";

interface IpcamPixelTransformationProps {
    factor: factor
}

export const IpcamPixelTransformation = ({ factor }: IpcamPixelTransformationProps) => {
    const svgRef = useRef<SVGSVGElement>(null)
    const { firstFramePath } = useProjectSlice();
    const { ipcam } = useMatrixSlice();
    const { importedPoints, cameraSolution } = ipcam

    if ( cameraSolution === undefined ) return null
    const { meanError, cameraPosition, reprojectionErrors } = cameraSolution

    useEffect(() => {
        d3.select(svgRef.current).selectAll('*').remove()
        if ( svgRef.current && importedPoints){
            ipcamSvg({
                factor,
                importedPoints,
                svgElement: svgRef.current,
                width: REPORT_IMAGES.IMAGES_IPCAM_WIDTH,
                height: REPORT_IMAGES.IMAGES_IPCAM_HEIGHT
            })
        }
    }, [importedPoints])

    return (
        <div className="pixel-transformation-with-image">
            <div className="image-and-svg-container">
                <img src={firstFramePath} width={REPORT_IMAGES.IMAGES_IPCAM_WIDTH} height={REPORT_IMAGES.IMAGES_IPCAM_HEIGHT} className="image-border-radius"/>
                <svg ref={svgRef} className="svg-in-image-container"/>
            </div>
            <div id="ipcam-transformation-info">
                <p> Reprojection Error: {meanError.toFixed(2)} px</p>
                <p> Number of Points: {reprojectionErrors.length} </p>
                <p> Camera Height: {cameraPosition[2].toFixed(2)} </p>
            </div>
        </div>
    )
}