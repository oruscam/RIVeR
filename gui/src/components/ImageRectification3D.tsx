import { Layer, Stage, Image } from "react-konva"
import { useMatrixSlice, useProjectSlice, useUiSlice } from "../hooks"
import { useEffect, useState } from "react"
import { imageZoom } from "../helpers"
import { KonvaEventObject } from "konva/lib/Node"
import { Ellipses, RedPoints, CrossPoints} from "./index"



export const ImageRectification3D = () => {
    const { ipcam } = useMatrixSlice()
    const { screenSizes } = useUiSlice()
    const { firstFramePath } = useProjectSlice()
    const { importedImages, activeImage } = ipcam
    const { imageWidth, imageHeight, factor } = screenSizes

    const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null)
    const [newImageSrc, setNewImageSrc] = useState<string>(importedImages !== undefined ? importedImages[activeImage!] : firstFramePath)
    const [resizeFactor, setResizeFactor] = useState(1)

    useEffect(() => {
        const newImageSrc = importedImages !== undefined ? importedImages[activeImage!] : firstFramePath
        setNewImageSrc(newImageSrc)
    }, [importedImages, activeImage, firstFramePath])

    useEffect(() => {
        const img = new window.Image()
        img.src = newImageSrc
        img.onload = () => {
            setCurrentImage(img)
        }
    }, [newImageSrc])

    const handleOnWheel = (event: KonvaEventObject<WheelEvent>) => {
        imageZoom(event, setResizeFactor, true)
    }

    return (
        <Stage 
            width={imageWidth}
            height={imageHeight}
            onWheel={handleOnWheel}
            className={`image-with-marks ${importedImages !== undefined ? '' : 'image-rectification-3d'}`}
        >
            <Layer>
                {
                    currentImage && (
                        <>
                            <Image
                                image={currentImage}
                                width={imageWidth}
                                height={imageHeight}
                            />
                            {/* <PointsRectification3D factor={factor as number} resizeFactor={resizeFactor}/>         */}
                            <Ellipses factor={factor as number}/>
                            <CrossPoints factor={factor as number}/>    
                            <RedPoints factor={factor as number}/>    
                        </>
                    )
                }
            </Layer>
        </Stage>
    )
}