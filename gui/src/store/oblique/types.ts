import { Point } from '../../types';

const defaultCoordinates: Point[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

const defaultDistances = {
  d12: 0,
  d23: 0,
  d34: 0,
  d41: 0,
  d13: 0,
  d24: 0,
};

interface ObliqueSolution {
  orthoImage: string;
  extent: number[];
  resolution: number;
  roi: number[];
  width: number;
  height: number;
}

interface ObliqueMode {
  drawPoints: boolean;
  coordinates: Point[];
  rwCoordinates?: Point[];
  distances: {
    d12: number;
    d23: number;
    d34: number;
    d41: number;
    d13: number;
    d24: number;
  };
  isDefaultCoordinates: boolean;
  isDistancesLoaded: boolean;
  solution: ObliqueSolution | null;
}

export type { ObliqueMode, ObliqueSolution };

export { defaultCoordinates, defaultDistances };
