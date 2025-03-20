import useImage from "use-image";
import { useMatrixSlice, useProjectSlice, useUiSlice } from "../hooks";
import { Image, Layer, Stage } from "react-konva";

import { getRelativePointerPosition, imageZoom } from "../helpers/konvaActions";
import { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useState } from "react";
import { Point } from "../types";
import { ObliquePointsLines, Points } from "./index";

export const ImageRectification2D = () => {
  const { obliquePoints, onSetObliqueCoordinates, onChangeObliqueCoordinates } =
    useMatrixSlice();
  const { screenSizes } = useUiSlice();
  const { coordinates, drawPoints, distances } = obliquePoints;
  const { imageWidth, imageHeight, factor } = screenSizes;

  const { firstFramePath } = useProjectSlice();

  const [image] = useImage(firstFramePath);

  const [localPoints, setLocalPoints] = useState<Point[]>(coordinates);
  const [resizeFactor, setResizeFactor] = useState(1);

  const [mousePresed, setMousePresed] = useState(false);

  const hanldeOnClick = (event: KonvaEventObject<MouseEvent>) => {
    if (drawPoints === false || distances.d12 !== 0) return;

    const stage = event.target.getStage();
    const pointerPosition = getRelativePointerPosition(stage);

    onSetObliqueCoordinates(pointerPosition, factor as number);
  };

  // Set the first point of the square

  const handleOnMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    if (localPoints[0].x !== 0 || drawPoints === false) return;
    setMousePresed(true);
    const stage = event.target.getStage();
    const pointerPosition = getRelativePointerPosition(stage);

    const newPoints = [...localPoints];
    newPoints[0] = pointerPosition;
    newPoints[1] = pointerPosition;

    setLocalPoints(newPoints);
  };

  const handleOnMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    if (localPoints[0].x === 0 || drawPoints === false || mousePresed === false)
      return;

    const stage = event.target.getStage();
    const pointerPosition = getRelativePointerPosition(stage);

    const newPoints = [...localPoints];
    newPoints[1] = pointerPosition;

    setLocalPoints(newPoints);
  };

  const handleOnMouseUp = (event: KonvaEventObject<MouseEvent>) => {
    if (localPoints[0].x === 0 || drawPoints === false || mousePresed === false)
      return;
    setMousePresed(false);

    const stage = event.target.getStage();
    const pointerPosition = getRelativePointerPosition(stage);

    const newPoints = [...localPoints];
    newPoints[1] = pointerPosition;

    setLocalPoints(newPoints);
    onSetObliqueCoordinates(newPoints, screenSizes);
  };

  const handleOnWheel = (event: KonvaEventObject<WheelEvent>) => {
    imageZoom(event, setResizeFactor, localPoints.length === 4);
  };

  useEffect(() => {
    if (coordinates.length !== 0) {
      const newPoints = coordinates.map((point) => {
        return {
          x: point.x / factor!,
          y: point.y / factor!,
        };
      });
      setLocalPoints(newPoints);
    } else {
      setLocalPoints([]);
    }
  }, [coordinates, factor]);

  return (
    <Stage
      width={imageWidth}
      height={imageHeight}
      onMouseDown={handleOnMouseDown}
      onMouseUp={handleOnMouseUp}
      onMouseMove={handleOnMouseMove}
      onWheel={handleOnWheel}
      className="image-with-marks"
    >
      <Layer>
        <Image image={image} width={imageWidth} height={imageHeight} />

        <ObliquePointsLines
          localPoints={localPoints}
          resizeFactor={resizeFactor}
          mousePresed={mousePresed}
        />

        {/* 
            
                If mousePresed is true, means that the user is dragging the mouse to set the second point of the square
                In this case, only can show the first point seted.
                When the user up the mouse button, the second point is set in the store and the square is drawed

            */}

        <Points
          localPoints={mousePresed ? [localPoints[0]] : localPoints}
          setPointsInStore={onChangeObliqueCoordinates}
          setLocalPoints={setLocalPoints}
          draggable={true}
          factor={factor}
          resizeFactor={resizeFactor}
          module="controlPoints"
        />
      </Layer>
    </Stage>
  );
};
