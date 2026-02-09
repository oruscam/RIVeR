interface QuiverData {
  x: number;
  y: number;
  u: number;
  v: number;
  velocity: number;
  color: string;
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
}

interface Section {
  name: string;
  dirPoints: Point[];
  sectionPoints: Point[];
}

export type {
  QuiverData,
  QuiverValuesResult,
  Point,
  Quiver,
  Section
};

