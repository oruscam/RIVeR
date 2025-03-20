export const getPointNames = (modeName: string) => {
  if (modeName === "pixel_size") {
    return { pointName1: "point_1", pointName2: "point_2" };
  } else {
    return { pointName1: "Left", pointName2: "Right" };
  }
};
