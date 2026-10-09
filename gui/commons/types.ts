interface QuiverData {
  x: number;
  y: number;
  u: number;
  v: number;
  velocity: number;
  color: string;
  /** Real-world position of the vector's origin, in metres. */
  east?: number;
  north?: number;
  /** Real-world velocity components, in m/s. */
  velocityEast?: number;
  velocityNorth?: number;
}

interface QuiverValuesResult {
  data: QuiverData[];
  min: number;
  max: number;
}

type Point = {
  x: number;
  y: number;
};

interface Quiver {
  x: number[];
  y: number[];
  u: number[][] | number[];
  v: number[][] | number[];
  typevector: number[];
  u_median?: number[];
  v_median?: number[];
  test: boolean;
  testFrameIndex?: number;
}

interface Section {
  name: string;
  dirPoints: Point[];
  sectionPoints: Point[];
}

export type { QuiverData, QuiverValuesResult, Point, Quiver, Section };
