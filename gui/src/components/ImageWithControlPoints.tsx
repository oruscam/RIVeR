import useImage from "use-image";
import { useMatrixSlice, useProjectSlice, useUiSlice } from "../hooks"
import { Image, Layer, Stage } from "react-konva";

import { getRelativePointerPosition, imageZoom } from "../helpers/konvaActions";
import { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useState } from "react";
import { Point } from "../types";
import { ControlPointsLines, Points } from "./index";

export const ImageWithControlPoints = () => {
    const { controlPoints, onSetDefaultControlCoordinates, onChangeControlPoints } = useMatrixSlice()
    const { screenSizes } = useUiSlice()
    const { coordinates, drawPoints, distances } = controlPoints
    const { imageWidth, imageHeight, factor } = screenSizes  

    const { firstFramePath } = useProjectSlice();
    const [ image ] = useImage(firstFramePath)


    const [ localPoints, setLocalPoints ] = useState<Point[]>(coordinates)
    const [resizeFactor, setResizeFactor] = useState(1)

    const hanldeOnClick = ( event: KonvaEventObject<MouseEvent> ) => {
      if ( drawPoints === false || distances.d12 !== 0 ) return;

      const stage = event.target.getStage();
      const pointerPosition = getRelativePointerPosition(stage)

      onSetDefaultControlCoordinates(pointerPosition, factor) 
    }

    const handleOnWheel = (event: KonvaEventObject<WheelEvent>) => {
      imageZoom(event, setResizeFactor, localPoints.length === 4)
    };

    useEffect(() => {
        if(coordinates.length !== 0){
          const newPoints = coordinates.map(point => {
            return {
              x: point.x / factor!,
              y: point.y / factor!
            }
          })
          setLocalPoints(newPoints);
        }else {
          setLocalPoints([])
        }
  
      }, [coordinates, factor])

      console.log(controlPoints)

  return (
    <Stage
        width={imageWidth}
        height={imageHeight}
        onMouseDown={hanldeOnClick}
        onWheel={handleOnWheel}
        className="image-with-marks"
    >
        <Layer>
            <Image
                image={image}
                width={imageWidth}
                height={imageHeight}
            />
            <ControlPointsLines localPoints={localPoints} resizeFactor={resizeFactor}/>
            <Points localPoints={localPoints} setPointsInStore={onChangeControlPoints} setLocalPoints={setLocalPoints}
            draggable={true}
            factor={factor}
            resizeFactor={resizeFactor}
            module="contolPoints"
            />
        </Layer>
    </Stage>
  )
}
