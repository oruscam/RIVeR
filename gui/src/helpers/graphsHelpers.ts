import { GRAPHS } from '../constants/constants';
import { SectionData } from '../store/section/types';
import { Point } from '../types';

const adapterData = (data: SectionData, x1Intersection: number) => {
  const {
    distance,
    plus_std,
    minus_std,
    percentile_95th,
    percentile_5th,
    Q,
    Q_portion,
    check,
    activeMagnitude,
    interpolated,
  } = data;

  const newDistance = distance.map((d) => {
    return d + x1Intersection!;
  });

  const newStreamwiseVelocityMagnitude = activeMagnitude;

  const newQ = Q.map((d, i) => {
    if (check[i] === false && interpolated === false) {
      return null;
    } else {
      return d;
    }
  });

  return {
    distance: newDistance,
    streamwise_velocity_magnitude: newStreamwiseVelocityMagnitude,
    plus_std,
    minus_std,
    percentile_95th,
    percentile_5th,
    Q: newQ,
    Q_portion: Q_portion,
  };
};

const adapterBathimetry = (
  line: Point[],
  x1Intersection: number,
  x2Intersection: number,
  level: number
): Point[] => {
  const newBathLine = line?.filter((d) => d.y <= level! && d.x >= x1Intersection! && d.x <= x2Intersection!);

  newBathLine?.unshift({ x: x1Intersection!, y: level! });
  newBathLine?.push({ x: x2Intersection!, y: level! });

  return newBathLine;
};
const generateXAxisTicks = (x1Intersection: number, x2Intersection: number, width: number): number[] => {
  let step = 0;

  if (width < 10) {
    step = 2;
  } else if (width < 30) {
    step = 5;
  } else {
    step = 15;
  }

  const ticks: number[] = [];

  // Añadir x1Intersection al arreglo de ticks
  ticks.push(x1Intersection);

  // Generar los valores entre x1Intersection y x2Intersection
  for (let i = Math.ceil(x1Intersection / step) * step; i < x2Intersection; i += step) {
    if (Math.abs(i - x1Intersection) > 2 && Math.abs(i - x2Intersection) > 2) {
      ticks.push(i);
    }
  }

  // Añadir x2Intersection al arreglo de ticks
  ticks.push(x2Intersection);

  return ticks;
};

const generateYAxisTicks = (array?: (number | null)[], min?: number, max?: number): number[] => {
  const minValue = min ? min : 0;
  const maxValue = max ? max : Math.max(...array!.filter((value): value is number => value !== null));

  const range = maxValue - minValue;
  const step = range / 4;

  const ticks = [minValue, minValue + step, minValue + 2 * step, minValue + 3 * step, maxValue];

  return ticks;
};

const getOrthoImageDimensions = (screenWidth: number, orthoWidth: number, orthoHeight: number ) => {
  let graphWidth;
  let graphHeight;
  const maxGraphWidth = screenWidth * GRAPHS.IPCAM_GRID_PROPORTION;
  
  const vertical = orthoHeight > orthoWidth;
  
  if (!vertical) {
    if (orthoWidth < maxGraphWidth) {
      graphWidth = orthoWidth;
      graphHeight = orthoHeight;
    } else {
      graphWidth = maxGraphWidth;
      graphHeight = (maxGraphWidth * orthoHeight) / orthoWidth;
    }
    if (graphWidth < GRAPHS.ORTHO_IMAGE_MIN_WIDTH) {
      graphWidth = GRAPHS.ORTHO_IMAGE_MIN_WIDTH;
      graphHeight = (GRAPHS.ORTHO_IMAGE_MIN_WIDTH * orthoHeight) / orthoWidth;
    }
  } else {
    const WIDTH_INCREASER = 1.1; // For better visualization, I have to figure out what happen // ! PROVISIONAL.

    if (orthoHeight < maxGraphWidth) {
      graphHeight = orthoHeight;
      graphWidth = orthoWidth * WIDTH_INCREASER;
    } else {
      graphHeight = maxGraphWidth;
      graphWidth = ((maxGraphWidth * orthoWidth) / orthoHeight) * WIDTH_INCREASER;
    }
  }
  
  return { graphWidth, graphHeight, maxGraphWidth };
}


export { adapterData, adapterBathimetry, generateXAxisTicks, generateYAxisTicks, getOrthoImageDimensions };