import { Line } from "react-konva";
import { Point } from "../types";
import { COLORS } from "../constants/constants";
import { getLineColor } from "../helpers";

interface ObliquePointsLinesProps {
  localPoints: Point[];
  resizeFactor: number;
  mousePresed: boolean;
}

export const ObliquePointsLines = ({
  localPoints,
  resizeFactor,
  mousePresed,
}: ObliquePointsLinesProps) => {
  const { D12, D13, D24 } = COLORS.CONTROL_POINTS;

  /* 
        The first point of the square is set when the user clicks on the image
        The second point is set when the user releases the mouse button
        The square is drawn when the user up mouse click button
        
        The conditional is to draw the first line, between set first point and unseted second point when user is dragging the mouse
        Only draw the first line, using only localPoints, without redux store. Its necessary to avoid the flickering effect
        
        When the user up the mouse button, the first two points are set in the store and calculated the square area.
    */

  if (mousePresed) {
    return (
      <Line
        points={[
          localPoints[0].x,
          localPoints[0].y,
          localPoints[1].x,
          localPoints[1].y,
        ]}
        strokeWidth={3 / resizeFactor}
        stroke={D12}
      />
    );
  }

  return (
    <>
      {localPoints.map((point: Point, index: number) => {
        const value = index === 3 ? -3 : 1;
        return (
          <Line
            key={index}
            points={[
              point.x,
              point.y,
              localPoints[index + value].x,
              localPoints[index + value].y,
            ]}
            strokeWidth={3 / resizeFactor}
            stroke={getLineColor(index)}
          />
        );
      })}
      <Line
        points={[
          localPoints[0].x,
          localPoints[0].y,
          localPoints[2].x,
          localPoints[2].y,
        ]}
        strokeWidth={3 / resizeFactor}
        stroke={D13}
      />
      <Line
        points={[
          localPoints[1].x,
          localPoints[1].y,
          localPoints[3].x,
          localPoints[3].y,
        ]}
        strokeWidth={3 / resizeFactor}
        stroke={D24}
      />
    </>
  );
};
