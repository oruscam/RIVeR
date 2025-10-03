import { useIpcamSlice } from '../hooks';
import { pinRed, pin, pinGrey } from '../assets/icons/icons';
import useImage from 'use-image';
import { Group, Image } from 'react-konva';
import { MARKS } from '../constants/constants';
import { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useState } from 'react';

interface PointsProps {
  factor: number;
  resizeFactor: number;
}

export const PointsIpcam = ({ factor, resizeFactor }: PointsProps) => {
  const { points, activePoint, cameraSolution, onSetPointPixelCoordinates } = useIpcamSlice();

  const [iconBlue] = useImage(pin);
  const [iconRed] = useImage(pinRed);
  const [iconGrey] = useImage(pinGrey);

  const [localPoints, setLocalPoints] = useState(points);

  //  CAMBIA EL ESTILO DEL POINTER CUANDO PASA POR ENCIMA DE UN PUNTO
  const handleCursorEnter = (event: KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'move';
    }
  };

  //  CAMBIA EL ESTILO DEL POINTER CUANDO PASA POR ENCIMA DE UN PUNTO
  const handleCursorLeave = (event: KonvaEventObject<MouseEvent>) => {
    const stage = event.target.getStage();
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  };

  const handleDragMove = (event: any, index: number) => {
    if (localPoints) {
      const newPoints = localPoints.map((p, i) =>
        i === index ? { ...p, x: event.target.x() * factor, y: event.target.y() * factor } : p
      );
      setLocalPoints(newPoints);
    }
  };

  const handleDragStart = (event: any, index: number) => {
    if (points) {
      const point = {
        x: parseFloat((event.target.x() * factor).toFixed(2)),
        y: parseFloat((event.target.y() * factor).toFixed(2)),
      };

      onSetPointPixelCoordinates({ index, point });
    }
  };

  const handleDragEnd = (event: any, index: number, draggable: boolean) => {
    if (draggable === false) return;
    if (points) {
      const point = {
        x: parseFloat((event.target.x() * factor).toFixed(2)),
        y: parseFloat((event.target.y() * factor).toFixed(2)),
      };

      onSetPointPixelCoordinates({ index, point });
    }
  };

  const onClickPoint = (index: number) => {
    onSetPointPixelCoordinates({ index, clickIcon: true });
  };

  const getIcon = (selected: boolean, activePoint: number | null, index: number) => {
    if (selected) {
      if (index === activePoint) {
        return iconRed;
      } else {
        return iconBlue;
      }
    } else {
      return iconGrey;
    }
  };

  useEffect(() => {
    setLocalPoints(points);
  }, [points]);

  return (
    <>
      {localPoints!.map((point, index) => {
        if (
          (point.wasEstablished === false && activePoint !== index) ||
          (point.selected === false && cameraSolution === null)
        )
          return null;
        const draggable = true;

        return (
          <Group key={index}>
            <Image
              image={getIcon(point.selected, activePoint, index)}
              x={point.x / factor}
              y={point.y / factor}
              width={MARKS.WIDTH / resizeFactor}
              height={MARKS.HEIGHT / resizeFactor}
              offsetX={MARKS.OFFSET_X / resizeFactor}
              offsetY={MARKS.OFFSET_Y / resizeFactor}
              onClick={() => onClickPoint(index)}
              onMouseEnter={draggable ? handleCursorEnter : undefined}
              onMouseLeave={draggable ? handleCursorLeave : undefined}
              draggable={draggable}
              onDragMove={(event) => handleDragMove(event, index)}
              onDragEnd={(event) => handleDragEnd(event, index, draggable)}
              onDragStart={(event) => handleDragStart(event, index)}
            />
          </Group>
        );
      })}
    </>
  );
};
