import { Point } from '../../types';

interface pixelSolution {
  orthoImage: string;
  extent: number[];
  resolution: number;
  secondPoint: Point;
  width: number;
  height: number;
}

interface UavMode {
  drawLine: boolean;
  isDraggingPoint: boolean;
  dirPoints: Point[];
  rwPoints: Point[];
  size: number;
  rwLength: number;
  extraFields: boolean;
  solution: pixelSolution | null;
}

export type { UavMode };
