// Helper functions for Hard Mode forms

import { defaultDistances } from "../store/oblique/types";
import { Point } from "../types";

// These functions assist in generating point names and determining label styles based on mode and type.
// They are used in forms that require user input for coordinates.
const getPointNames = (mode: string, fields: number) => {
  let pointsNames: string[] = [];

  const x = mode === 'rw' ? 'east' : 'x';
  const y = mode === 'rw' ? 'north' : 'y';
  for (let i = 1; i <= fields / 2; i++) {
    pointsNames.push(`${x}Point${i}`);
    pointsNames.push(`${y}Point${i}`);
  }

  return pointsNames;
};

const getLabelStyle = (type: string, step: number, fields: number, index: number) => {
  let style = index >= fields / 2 ? 'green' : 'red';

  if (type === 'uav' && step === 3) {
    style = '';
  } else if (type === 'oblique' && step === 3) {
    style = index > 1 ? 'lightblue' : 'red';
  } else {
    style = index >= fields / 2 ? 'green' : 'red';
  }

  return style;
}

const getPointsDistances = (points: Point[]) => {
  let distances = { ...defaultDistances };

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const { x: x1, y: y1 } = points[i];
      const { x: x2, y: y2 } = points[j];
      const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      if (i === 0 && j === 1) distances.d12 = distance;
      if (i === 1 && j === 2) distances.d23 = distance;
      if (i === 2 && j === 3) distances.d34 = distance;
      if (i === 0 && j === 3) distances.d41 = distance;
      if (i === 0 && j === 2) distances.d13 = distance;
      if (i === 1 && j === 3) distances.d24 = distance;
    }
  }

  return distances;
}

export { getPointNames, getLabelStyle, getPointsDistances };