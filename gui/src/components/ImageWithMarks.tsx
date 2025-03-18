import { useEffect, useState } from "react";
import useImage from "use-image";
import { Group, Image, Layer, Line, Stage } from "react-konva";
import { KonvaEventObject } from "konva/lib/Node";
import { useSectionSlice, useProjectSlice, useUiSlice } from "../hooks";
import { Points, DrawSections } from "./index";
import { Point } from "../types";
import {
  getRelativePointerPosition,
  imageZoom,
  onMouseDownPixelSize,
  onMouseUpPixelSize,
} from "../helpers";

export const ImageWithMarks = () => {
  const { seeAll, screenSizes } = useUiSlice();
  const { imageWidth, imageHeight, factor } = screenSizes;
  const { onSetDirPoints, sections, activeSection } = useSectionSlice();
  const { firstFramePath } = useProjectSlice();
  const { drawLine, dirPoints } = sections[activeSection];

  const [localPoints, setLocalPoints] = useState<Point[]>([]);
  const [mousePressed, setMousePressed] = useState(false);
  const [currentMousePosition, setCurrentMousePosition] = useState<Point>({
    x: 0,
    y: 0,
  });

  const [image] = useImage(firstFramePath);

  const [resizeFactor, setResizeFactor] = useState(1);

  // * Zoom
  const handleOnWheel = (event: KonvaEventObject<WheelEvent>) => {
    imageZoom(event, setResizeFactor, localPoints.length === 2);
  };

  // * Funciones para dibujar lineas
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
    onSetDirPoints({ points: newPoints, factor: factor!, index: null }, null);
  };

  const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage();
    const pointerPosition = getRelativePointerPosition(stage);
    setCurrentMousePosition(pointerPosition);
  };

  // * Trae los puntos del store y los pone en el estado local.

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
  }, [activeSection, dirPoints, factor]);

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
          {seeAll ? (
            <DrawSections
              localPoints={localPoints}
              setLocalPoints={setLocalPoints}
              factor={factor!}
              draggable={true}
              resizeFactor={resizeFactor}
              module="xSections"
              localDrawLine={drawLine}
            />
          ) : (
            <DrawSections
              factor={factor!}
              setLocalPoints={setLocalPoints}
              draggable={true}
              resizeFactor={resizeFactor}
              module="xSections"
            />
          )}
          {mousePressed && localPoints.length === 1 && (
            <Group>
              <Line
                points={[
                  localPoints[0].x,
                  localPoints[0].y,
                  currentMousePosition.x,
                  currentMousePosition.y,
                ]}
                stroke="#F5BF61"
                strokeWidth={2.8}
                lineCap="round"
              />
              <Points
                setLocalPoints={setLocalPoints}
                localPoints={localPoints}
                module={"xSections"}
                resizeFactor={resizeFactor}
              ></Points>
            </Group>
          )}
        </Layer>
      </Stage>
    </>
  );
};
