import { Point } from "../types";

export const getDirectionVector = (points : Point[], total_distance: number): [number, number] => {
  const { x: east_l, y: north_l } = points[0];
  const { x: east_r, y: north_r } = points[1];
  const direction_vector: [number, number] = [
      (east_r - east_l) / total_distance,
      (north_r - north_l) / total_distance
  ];

  return direction_vector;
}