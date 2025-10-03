import { Group } from "react-konva";
import { useMatrixSlice, useSectionSlice, useUiSlice } from "../hooks";
import { Points } from "./Points";
import { LineAndText } from "./LineAndText";

interface DrawSections {
  localPoints?: { x: number; y: number }[];
  setLocalPoints?: (dirPoints: { x: number; y: number }[]) => void;
  factor: number;
  draggable: boolean;
  drawPins?: boolean;
  resizeFactor?: number;
  module?: string;
  localDrawLine?: boolean;
}

export const DrawSections = ({
  factor,
  setLocalPoints,
  draggable,
  localPoints,
  drawPins,
  resizeFactor,
  module,
  localDrawLine,
}: DrawSections) => {
  const { sections, activeSection, onSetDirPoints } = useSectionSlice();
  const { onSetPixelDirection } = useMatrixSlice();
  const { seeAll } = useUiSlice();

  return (
    <>
      {localPoints ? (
        <Group>
          {localPoints.length === 2 && localDrawLine && (
            <LineAndText
              localPoints={localPoints}
              isPixelSize={module === "pixelSize"}
              resizeFactor={resizeFactor}
              factor={factor}
              index={activeSection}
            />
          )}
          <Points
            localPoints={localPoints}
            setPointsInStore={onSetPixelDirection}
            setLocalPoints={setLocalPoints}
            draggable={true}
            module={module}
            factor={factor}
            resizeFactor={resizeFactor}
          />
        </Group>
      ) : (
        sections.map((section, index) => {
          if (section.dirPoints.length === 0) return;
          if (!seeAll && activeSection !== index) return;
          const reducedPoints = section.dirPoints.map((point) => {
            return {
              x: point.x / factor,
              y: point.y / factor,
            };
          });
          return (
            <Group key={index}>
              <LineAndText
                isPixelSize={false}
                resizeFactor={resizeFactor}
                factor={factor}
                index={index}
              />
              {(setLocalPoints || drawPins) && (
                <Points
                  localPoints={reducedPoints}
                  setPointsInStore={onSetDirPoints}
                  setLocalPoints={setLocalPoints}
                  draggable={draggable ? index === activeSection : false}
                  module={module}
                  factor={factor}
                  resizeFactor={resizeFactor}
                />
              )}
            </Group>
          );
        })
      )}
    </>
  );
};
