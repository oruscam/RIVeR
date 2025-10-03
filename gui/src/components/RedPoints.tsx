import { Circle, Group, Line } from 'react-konva';
import { COLORS } from '../constants/constants';
import { useIpcamSlice } from '../hooks';

export const RedPoints = ({ factor, resizeFactor }: { factor: number; resizeFactor: number }) => {
  const { cameraSolution, points } = useIpcamSlice();

  if (cameraSolution === null || points === null) return null;

  return (
    <Group>
      {points.map((point, index) => {
        const { x, y, selected, wasEstablished, projectedPoint } = point;
        if (selected === false || projectedPoint === null) return;

        const [xProjected, yProjected] = projectedPoint;

        return (
          <Group key={`group-${index}`}>
            {x !== 0 && y !== 0 && wasEstablished && (
              <Line
                key={`line-${index}`}
                points={[x / factor, y / factor, xProjected / factor, yProjected / factor]}
                stroke={COLORS.RED}
                strokeWidth={3 / resizeFactor}
              />
            )}
            <Circle
              key={`circle-${index}`}
              x={xProjected / factor}
              y={yProjected / factor}
              radius={3 / resizeFactor}
              fill={COLORS.RED}
            />
          </Group>
        );
      })}
    </Group>
  );
};
