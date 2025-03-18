import { Group, Ellipse as KonvaEllipse } from "react-konva";
import { useMatrixSlice } from "../hooks";
import { COLORS } from "../constants/constants";

export const Ellipses = ({ factor }: { factor: number }) => {
  const { ipcam } = useMatrixSlice();
  const { cameraSolution, importedPoints } = ipcam;

  if (cameraSolution === undefined || importedPoints === undefined) return null;

  return (
    <Group>
      {importedPoints.map((point, index) => {
        const { selected, ellipse } = point;
        if (selected === false || ellipse === undefined) return null;

        const [x, y] = ellipse.center;
        const width = ellipse.width / (factor * 1.8);
        const height = ellipse.height / (factor * 1.8);
        const angle = ellipse.angle;
        return (
          <KonvaEllipse
            key={index}
            x={x / factor}
            y={y / factor}
            radiusX={width}
            radiusY={height}
            fill={COLORS.ELLIPSE.FILL}
            stroke={COLORS.ELLIPSE.STROKE}
            rotation={angle}
          />
        );
      })}
    </Group>
  );
};
