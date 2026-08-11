import { Limits, Point } from '../types';

const getBathimetryLimitsY = (line: Point[]): Limits => {
  const { ys } = line.reduce(
    (acc, { x, y }) => {
      if (x !== undefined && y !== undefined) {
        acc.xs.push(x);
        acc.ys.push(y);
      }
      return acc;
    },
    { xs: [] as number[], ys: [] as number[] }
  );
  const min = Math.min(...ys);
  let max;

  if (ys[0] >= ys[ys.length - 1]) {
    max = ys[ys.length - 1];
  } else {
    max = ys[0];
  }

  return {
    max: parseFloat(max.toFixed(2)),
    min: min,
  };
};

const getBathimetryLimitsX = (line: Point[]): Limits => {
  const xs = line.map((point) => point.x);
  const min = Math.min(...xs);
  const max = Math.max(...xs);

  return {
    max: max,
    min: min,
  };
};

export const getIntersectionPoints = (data: Point[], level: number): Point[] => {
  let intersectionPoints: Point[] = [];
  for (let i = 0; i < data.length - 1; i++) {
    let currentPoint = { ...data[i] };
    let nextPoint = { ...data[i + 1] };

    currentPoint.y = parseFloat(currentPoint.y.toFixed(2));
    nextPoint.y = parseFloat(nextPoint.y.toFixed(2));

    // Verifica si el nivel está entre los puntos actuales y siguientes
    if ((currentPoint.y <= level && nextPoint.y >= level) || (currentPoint.y >= level && nextPoint.y <= level)) {
      // Interpolación lineal para encontrar la posición exacta de intersección
      const t = (level - currentPoint.y) / (nextPoint.y - currentPoint.y);
      const intersectX = currentPoint.x + t * (nextPoint.x - currentPoint.x);
      const newIntersection = { x: intersectX, y: level };

      // Verifica si el nuevo punto de intersección es diferente del último punto agregado
      if (
        intersectionPoints.length === 0 ||
        (intersectionPoints.length > 0 &&
          intersectionPoints[intersectionPoints.length - 1].x !== newIntersection.x)
      ) {
        intersectionPoints.push(newIntersection);
      }
    }
  }

  return intersectionPoints;
};

export interface WetSegment {
  x1: number;
  x2: number;
}

/**
 * Groups a bed profile into contiguous wet segments at the given water level,
 * so an island (bed rising above the level in the middle of the channel) yields
 * two or more segments instead of a single range bridging over it. Mirrors
 * find_wet_segments() in river/core/compute_section.py.
 */
export const findWetSegments = (data: Point[], level: number): WetSegment[] => {
  const merged: Point[] = [];
  for (let i = 0; i < data.length; i++) {
    const current = { ...data[i], y: parseFloat(data[i].y.toFixed(2)) };
    merged.push(current);

    if (i < data.length - 1) {
      const next = { ...data[i + 1], y: parseFloat(data[i + 1].y.toFixed(2)) };
      if ((current.y < level && next.y > level) || (current.y > level && next.y < level)) {
        const t = (level - current.y) / (next.y - current.y);
        merged.push({ x: current.x + t * (next.x - current.x), y: level });
      }
    }
  }
  merged.sort((a, b) => a.x - b.x);

  const segments: WetSegment[] = [];
  let start: number | undefined;
  for (let i = 0; i < merged.length; i++) {
    const isWet = merged[i].y <= level;
    if (isWet && start === undefined) {
      start = merged[i].x;
    } else if (!isWet && start !== undefined) {
      segments.push({ x1: start, x2: merged[i - 1].x });
      start = undefined;
    }
  }
  if (start !== undefined) {
    segments.push({ x1: start, x2: merged[merged.length - 1].x });
  }

  return segments;
};

/**
 * Builds the profile used to shade the wetted area of the chart: for each wet
 * segment, the bed points within its range plus synthetic boundary points
 * pinned exactly at `level`. Concatenating segments this way is enough for the
 * chart's existing d3 area() (y0 = min(d.y, level)) to render zero height
 * across dry gaps (islands) between segments, with no per-segment SVG element.
 */
export const buildWetSegmentsProfile = (line: Point[], wetSegments: WetSegment[], level: number): Point[] => {
  const profile: Point[] = [];
  wetSegments.forEach((segment) => {
    const segmentPoints = line.filter((d) => d.x >= segment.x1 && d.x <= segment.x2 && d.y <= level);
    profile.push({ x: segment.x1, y: level }, ...segmentPoints, { x: segment.x2, y: level });
  });
  return profile;
};

export const getBathimetryValues = (line: Point[], level?: number) => {
  const yLimits = getBathimetryLimitsY(line);
  const xLimits = getBathimetryLimitsX(line);

  const effectiveLevel = level ? level : yLimits.max;
  const intersectionPoints = getIntersectionPoints(line, effectiveLevel);

  if (intersectionPoints.length === 0) {
    return {
      error: {
        message: 'bathimetryNotValid',
        value: level,
      },
    };
  }

  const x1Intersection = intersectionPoints[0].x;
  const x2Intersection = intersectionPoints[intersectionPoints.length - 1].x;
  const bathWidth = x2Intersection - x1Intersection;
  const wetSegments = findWetSegments(line, effectiveLevel);

  return {
    data: {
      xMin: xLimits.min,
      xMax: xLimits.max,
      yMin: yLimits.min,
      yMax: yLimits.max,
      level: effectiveLevel,
      x1Intersection,
      x2Intersection,
      width: bathWidth,
      leftBank: 0,
      wetSegments,
    },
  };
};
