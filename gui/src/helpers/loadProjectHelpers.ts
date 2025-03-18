import { PixelSize } from "../store/section/types";
import { getBathimetryValues } from "./getBathimetryValues";
import { MODULE_NUMBER } from "../constants/constants";
import { cameraSolution, importedPoint } from "../types";
import { appendSolutionToImportedPoints } from "./appendSolutionsToImportedPoints";
import { transformPixelToRealWorld } from "./coordinates";

/**
 * This file contains helper functions to load the project data from the projects file.
 * It is used in the useProjectSlice.ts file.
 */

/**
 *
 * @param video_range - video data saved in the project file
 * @param dispatch - redux dispatch
 * @param setVideoParameters - redux action to set video parameters
 * @returns - void
 */

const onLoadVideoParameters = (
  video_range: VideoRange,
  dispatch: any,
  setVideoParameters: any,
  fps: number,
) => {
  const { step, start, end, factor } = video_range;
  dispatch(
    setVideoParameters({
      step: step,
      startTime: parseFloat((start / fps).toFixed(2)),
      endTime: parseFloat((end / fps).toFixed(2)),
      startFrame: start,
      endFrame: end,
      factor,
      factorChanged: false,
    }),
  );
  return;
};

/**
 *
 * @param pixel_size - pixel size data saved in the project file
 * @param section - section to update
 * @param dispatch - redux dispatch
 * @param updateSection  - redux action to update section
 * @returns
 */

const onLoadPixelSize = (
  pixel_size: pixel_size,
  currentPixel: PixelSize,
  dispatch: any,
  updatePixelSize: any,
  orthoImage: string,
  transformation: any,
  matrix: number[][],
) => {
  const { x1, y1, x2, y2, rw_length, size, east1, east2, north1, north2 } =
    pixel_size;

  const secondPoint = transformPixelToRealWorld(x2, y2, matrix);

  dispatch(
    updatePixelSize({
      ...currentPixel,
      size: size,
      rwLength: rw_length,
      rwPoints: [
        { x: east1, y: north1 },
        { x: east2, y: north2 },
      ],
      dirPoints: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ],
      drawLine: true,
      solution:
        transformation !== undefined
          ? {
              orthoImage: orthoImage,
              extent: transformation.extent,
              resolution: transformation.resolution,
              secondPoint: { x: secondPoint[0], y: secondPoint[1] },
            }
          : undefined,
    }),
  );
  return;
};

const onLoadObliquePoints = (
  control_points: control_points,
  dispatch: any,
  setControlPoints: any,
  orthoImage: string,
  transformation: any,
  matrix: number[][],
) => {
  const { coordinates: coordinatesObject, distances } = control_points;
  const coordinates = [
    { x: coordinatesObject.x1, y: coordinatesObject.y1 },
    { x: coordinatesObject.x2, y: coordinatesObject.y2 },
    { x: coordinatesObject.x3, y: coordinatesObject.y3 },
    { x: coordinatesObject.x4, y: coordinatesObject.y4 },
  ];

  const isDefaultCoordinates = false;

  const rwCoordinates = coordinates.map((point) => {
    const newPoints = transformPixelToRealWorld(point.x, point.y, matrix);
    return { x: newPoints[0], y: newPoints[1] };
  });

  dispatch(
    setControlPoints({
      coordinates: coordinates,
      rwCoordinates: rwCoordinates,
      distances: {
        d12: distances.d12,
        d23: distances.d23,
        d34: distances.d34,
        d41: distances.d41,
        d13: distances.d13,
        d24: distances.d24,
      },
      drawPoints: true,
      isDefaultCoordinates,
      isDistancesLoaded: true,
      solution:
        transformation !== undefined
          ? {
              orthoImage: orthoImage,
              extent: transformation.extent,
              resolution: transformation.resolution,
              roi: transformation.roi,
            }
          : undefined,
    }),
  );
};

/**
 *
 * @param values - cross sections data saved in the project file
 * @param dispatch - redux dispatch
 * @param updateSection - redux action to update section
 * @param addSection - redux action to add section
 * @param sections - sections state. By default we have pixel_size and CS_default_1. In the first lop on the xsections we update the CS_default_1 section. And then we add the rest of the sections.
 */

const onLoadCrossSections = (
  values: XSections,
  dispatch: any,
  updateSection: any,
  addSection: any,
  sections: any,
  ipcRenderer: any,
  setSummary?: any,
) => {
  let flag = true;
  let flagData = false;
  Object.entries(values).forEach(
    async ([key, value]: [string, XSectionValue]) => {
      const {
        rw_length,
        xl,
        xr,
        yl,
        yr,
        dir_xl,
        dir_yl,
        dir_xr,
        dir_yr,
        dir_east_l,
        dir_east_r,
        dir_north_l,
        dir_north_r,
        bath,
        level,
        left_station,
        alpha,
        num_stations,
        distance,
        interpolated,
      } = value;

      if (distance) {
        flagData = true;
      }

      try {
        if (key === "summary" && setSummary !== undefined) {
          dispatch(setSummary(values.summary));
          return;
        }

        if (key === "summary") {
          return;
        }

        const { line, name } = await ipcRenderer.invoke("get-bathimetry", {
          path: bath,
        });
        const { data } = getBathimetryValues(line, level);
        const {
          yMax,
          yMin,
          xMax,
          xMin,
          x1Intersection,
          x2Intersection,
          width,
        } = data
          ? data
          : {
              yMax: 0,
              yMin: 0,
              xMax: 0,
              xMin: 0,
              x1Intersection: 0,
              x2Intersection: 0,
              width: 0,
            };

        if (flag) {
          flag = false;
          dispatch(
            updateSection({
              ...sections[0],
              name: key,
              drawLine: true,
              sectionPoints: [
                { x: xl, y: yl },
                { x: xr, y: yr },
              ],
              dirPoints: [
                { x: dir_xl, y: dir_yl },
                { x: dir_xr, y: dir_yr },
              ],
              rwPoints: [
                { x: dir_east_l, y: dir_north_l },
                { x: dir_east_r, y: dir_north_r },
              ],
              pixelSize: { size: 0, rwLength: rw_length },
              bathimetry: {
                width: width,
                level: level,
                line: line,
                yMax: yMax,
                yMin: yMin,
                xMax: xMax,
                xMin: xMin,
                leftBank: left_station,
                x1Intersection: x1Intersection,
                x2Intersection: x2Intersection,
                path: bath,
                name: name,
              },
              alpha: alpha,
              numStations: num_stations,
              interpolated: interpolated,
              data: { ...value, activeCheck: value.check },
            }),
          );
        } else {
          dispatch(
            addSection({
              name: key,
              drawLine: true,
              sectionPoints: [
                { x: xl, y: yl },
                { x: xr, y: yr },
              ],
              dirPoints: [
                { x: dir_xl, y: dir_yl },
                { x: dir_xr, y: dir_yr },
              ],
              rwPoints: [
                { x: dir_east_l, y: dir_north_l },
                { x: dir_east_r, y: dir_north_r },
              ],
              pixelSize: { size: 0, rwLength: rw_length },
              bathimetry: {
                width: width,
                level: level,
                line: line,
                yMax: yMax,
                yMin: yMin,
                xMax: xMax,
                xMin: xMin,
                leftBank: left_station,
                x1Intersection: x1Intersection,
                x2Intersection: x2Intersection,
                path: bath,
                name: name,
              },
              alpha: alpha,
              numStations: num_stations,
              interpolated: interpolated,
              data: { ...value, activeCheck: value.check },
            }),
          );
        }
      } catch (error) {
        console.log(error);
      }
    },
  );

  if (flagData) {
    return MODULE_NUMBER.RESULTS;
  } else {
    return MODULE_NUMBER.ANALIZING;
  }
};

const onLoadProcessingForm = (
  values: ProcessingValues,
  dispatch: any,
  updateForm: any,
) => {
  const {
    artificial_seeding,
    clahe,
    clip_limit,
    grayscale,
    median_test_epsilon,
    median_test_filtering,
    median_test_threshold,
    remove_background,
    std_filtering,
    std_threshold,
    interrogation_area_1,
    interrogation_area_2,
    roi_height,
  } = values;

  dispatch(
    updateForm({
      artificialSeeding: artificial_seeding,
      clahe: clahe,
      clipLimit: clip_limit,
      grayscale: grayscale,
      medianTestEpsilon: median_test_epsilon,
      medianTestFiltering: median_test_filtering,
      medianTestThreshold: median_test_threshold,
      removeBackground: remove_background,
      stdFiltering: std_filtering,
      stdThreshold: std_threshold,
      step1: interrogation_area_1,
      step2: interrogation_area_2,
      heightRoi: roi_height,
    }),
  );
};

const onLoad3dRectification = (
  rectification3d: {
    points: importedPoint[];
    cameraSolution: cameraSolution;
    mode: string;
    images: string;
    imagesPath: string;
  },
  dispatch: any,
  setIpcamPoints: any,
  setCameraSolution: any,
  setIpcamImages: any,
) => {
  let filePrefix = import.meta.env.VITE_FILE_PREFIX;
  filePrefix = filePrefix === undefined ? "" : filePrefix;
  const { points, cameraSolution, mode, images } = rectification3d;
  const { newImportedPoints, numPoints } = appendSolutionToImportedPoints(
    points,
    cameraSolution,
    mode === "direct-solve",
  );

  delete cameraSolution.projectedPoints;
  delete cameraSolution.uncertaintyEllipses;

  let zMin = Infinity;
  let zMax = -Infinity;

  newImportedPoints.forEach((point) => {
    if (point.Z > zMax) zMax = point.Z;
    if (point.Z < zMin) zMin = point.Z;
  });

  dispatch(
    setIpcamPoints({
      points: newImportedPoints,
      path: undefined,
      counter: numPoints,
      zLimits: { min: zMin, max: zMax },
    }),
  );
  dispatch(
    setCameraSolution({
      ...cameraSolution,
      orthoImagePath: filePrefix + cameraSolution.orthoImagePath,
      mode: mode,
      numPoints: numPoints,
    }),
  );

  if (images !== undefined) {
    dispatch(setIpcamImages({ images: images, path: images }));
  }
};

export {
  onLoadCrossSections,
  onLoadObliquePoints,
  onLoadPixelSize,
  onLoadProcessingForm,
  onLoadVideoParameters,
  onLoad3dRectification,
};

interface pixel_size {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  rw_length: number;
  size: number;
  east1: number;
  east2: number;
  north1: number;
  north2: number;
}

interface VideoRange {
  step: number;
  start: number;
  end: number;
  factor: number;
}

interface XSectionValue {
  rw_length: number;
  east_l: number;
  north_l: number;
  east_r: number;
  north_r: number;
  xl: number;
  yl: number;
  xr: number;
  yr: number;
  dir_xl: number;
  dir_yl: number;
  dir_xr: number;
  dir_yr: number;
  dir_east_l: number;
  dir_north_l: number;
  dir_east_r: number;
  dir_north_r: number;
  bath: string;
  level: number;
  left_station: number;
  alpha: number;
  num_stations: number;
  id: number;
  east: number[];
  north: number[];
  distance: number[];
  x: number[];
  y: number[];
  displacement_x: number[];
  displacement_y: number[];
  displacement_east: number[];
  displacement_north: number[];
  streamwise_east: number[];
  streamwise_north: number[];
  crosswise_east: number[];
  crosswise_north: number[];
  streamwise_velocity_magnitude: number[];
  depth: number[];
  check: boolean[];
  W: number[];
  A: number[];
  Q: number[];
  Q_portion: number[];
  minus_std: number[];
  plus_std: number[];
  "5th_percentile": number[];
  "95th_percentile": number[];
  total_Q: number;
  measured_Q: number;
  interpolated_Q: number;
  total_A: number;
  total_W: number;
  max_depth: number;
  average_depth: number;
  mean_V: number;
  mean_Vs: number;
  displacement_x_streamwise: number[];
  displacement_y_streamwise: number[];
  filled_streamwise_velocity_magnitude: number[];
  filled_streamwise_east: number[];
  filled_streamwise_north: number[];
  filled_crosswise_east: number[];
  filled_crosswise_north: number[];
  Q_minus_std: number[];
  Q_plus_std: number[];
  total_q_std: number;
  interpolated: boolean;
  showVelocityStd: boolean;
  showPercentile: boolean;
  streamwise_x: number[];
  streamwise_y: number[];
}

interface XSections {
  [key: string]: XSectionValue;
}

interface ProcessingValues {
  artificial_seeding?: boolean;
  clahe?: boolean;
  clip_limit?: number;
  grayscale?: boolean;
  median_test_epsilon?: number;
  median_test_filtering?: boolean;
  median_test_threshold?: number;
  remove_background?: boolean;
  std_filtering?: boolean;
  std_threshold?: number;
  interrogation_area_1?: number;
  interrogation_area_2?: number;
  roi_height?: number;
}

interface control_points {
  coordinates: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
    x4: number;
    y4: number;
  };
  distances: {
    d12: number;
    d23: number;
    d34: number;
    d41: number;
    d13: number;
    d24: number;
  };
}
