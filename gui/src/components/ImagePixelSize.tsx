import { useEffect, useState } from "react";
import { useMatrixSlice, useProjectSlice, useUiSlice } from "../hooks";
import {
  getRelativePointerPosition,
  imageZoom,
  onMouseDownPixelSize,
  onMouseUpPixelSize,
} from "../helpers";
import { KonvaEventObject } from "konva/lib/Node";
import { Group, Image, Layer, Line, Stage } from "react-konva";
import { DrawSections } from "./DrawSections";
import { COLORS } from "../constants/constants";
import { Points } from "./Points";
import useImage from "use-image";
import { Point } from "../types";

export const ImagePixelSize = () => {
  const { screenSizes } = useUiSlice();
  const { imageWidth, imageHeight, factor } = screenSizes;

  const { pixelSize, onSetPixelDirection } = useMatrixSlice();
  const { dirPoints, drawLine } = pixelSize;

  const [localPoints, setLocalPoints] = useState<Point[]>([]);
  const [mousePressed, setMousePressed] = useState(false);
  const [currentMousePosition, setCurrentMousePosition] = useState<Point>({
    x: 0,
    y: 0,
  });

  const { firstFramePath } = useProjectSlice();
  const [image] = useImage(firstFramePath);
  const [resizeFactor, setResizeFactor] = useState(1);

  const handleOnWheel = (event: KonvaEventObject<WheelEvent>) => {
    imageZoom(event, setResizeFactor, localPoints.length === 2);
  };

  const handleMouseDown = (event: KonvaEventObject<MouseEvent>) => {
    if (localPoints.length === 2 || drawLine === false) return;

    onMouseDownPixelSize(
      event,
      setLocalPoints,
      setCurrentMousePosition,
      setMousePressed,
    );
  };

  const handleMouseUp = (event: KonvaEventObject<MouseEvent>) => {
    if (!mousePressed) return;

    const newPoints = onMouseUpPixelSize(
      event,
      localPoints,
      setLocalPoints,
      setMousePressed,
    );
    onSetPixelDirection(
      { points: newPoints, factor: factor!, index: null },
      null,
    );
  };

  const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage();
    const pointerPosition = getRelativePointerPosition(stage);
    setCurrentMousePosition(pointerPosition);
  };

  // Set the store points into local points

  useEffect(() => {
    if (dirPoints.length !== 0) {
      const newPoints = dirPoints.map((point) => {
        return {
          x: point.x / factor!,
          y: point.y / factor!,
        };
      });
      setLocalPoints(newPoints);
    } else {
      setLocalPoints([]);
    }
  }, [dirPoints, factor]);

  return (
    <>
      <Stage
        width={imageWidth}
        height={imageHeight}
        className="image-with-marks"
        onWheel={handleOnWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={
          drawLine && mousePressed && localPoints.length < 2
            ? handleMouseMove
            : undefined
        }
      >
        <Layer>
          <Image image={image} width={imageWidth} height={imageHeight} />

          <DrawSections
            localPoints={localPoints}
            setLocalPoints={setLocalPoints}
            factor={factor!}
            draggable={true}
            drawPins={true}
            resizeFactor={resizeFactor}
            module="pixelSize"
            localDrawLine={drawLine}
          />

          {mousePressed && localPoints.length === 1 && (
            <Group>
              <Line
                points={[
                  localPoints[0].x,
                  localPoints[0].y,
                  currentMousePosition.x,
                  currentMousePosition.y,
                ]}
                stroke={COLORS.LIGHT_BLUE}
                strokeWidth={2.8}
                lineCap="round"
              />
              <Points
                setLocalPoints={setLocalPoints}
                localPoints={localPoints}
                module="pixelSize"
                resizeFactor={resizeFactor}
              />
            </Group>
          )}
        </Layer>
      </Stage>
    </>
  );
};
