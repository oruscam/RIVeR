import { Group, Ellipse as KonvaEllipse } from 'react-konva';
import { useIpcamSlice } from '../hooks';
import { COLORS } from '../constants/constants';

export const Ellipses = ({ factor }: { factor: number }) => {
  const { cameraSolution, points } = useIpcamSlice();

  if (cameraSolution === null || points === null) return null;

  return (
    <Group>
      {points.map((point, index) => {
        const { selected, ellipse } = point;
        if (selected === false || ellipse === null) return null;

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
