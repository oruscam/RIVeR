
interface Ellipse {
  // Center of the ellipse [x, y]
  center: number[];
  // Length of the major axis
  width: number;
  // Length of the minor axis
  height: number;
  // Rotation angle in radians
  angle: number;
};

interface IpcamPoint {
  // Unique identifier for the point
  label: string; 
  // Real-world coordinates
  X: number;
  Y: number; 
  Z: number; 
  // Image coordinates
  x: number; 
  // Image coordinate
  y: number; 
  // Whether the point is currently selected in the UI
  selected: boolean;
  // Whether the point has been used in the camera solution
  wasEstablished: boolean;
  // Index of the image this point is related to, can be null
  image: number | null;
  // Uncertainty ellipse for the point, can be null
  ellipse: Ellipse | null;
  // Projected point coordinates after applying the camera matrix, can be null
  projectedPoint: [number, number] | null;
}

interface CameraSolution {
  // File path to ortho image
  orthoImagePath: string;
  // Extent of the ortho image [minX, minY, maxX, maxY]
  orthoExtent: number[];
  // Reprojection errors for each point used in the solution
  reprojectionErrors: number[];
  // Mean reprojection error
  meanError: number;
  // Camera position in real world coordinates [X, Y, Z]
  cameraPosition: number[];
  // Camera matrix (3x4)
  cameraMatrix: number[][];
  // Mode of the solution (e.g., 'direct-solve', 'optimize')
  mode: string;
  // Number of points used in the solution
  numPoints?: number;
  // Indices of the points used in the solution
  pointIndices?: number[];
}

interface Ipcam {
  // File path to imported points
  pointsPath: string | null;
  // Imported points from file
  points: IpcamPoint[] | null;
  // Folder path to imported images
  imagesPath: string | null;
  // Imported images from folder, all the paths
  importedImages: string[] | null;
  // Index of the active image in importedImages array
  activeImage: number | null;
  // Index of the active point in importedPoints array
  activePoint: number | null;
  // Camera solution after running the calibration
  cameraSolution: CameraSolution | null;
  selectedCounter: number;
  zLimits: {
    min: number;
    max: number;
  };
}

interface SetPointsPayload {
  points: IpcamPoint[];
  path?: string;
  counter: number;
  zLimits?: { min: number; max: number };
}

interface SetImagesPayload {
  images: string[];
  path: string;
}

interface SetCustomPointPayload {
  point: IpcamPoint
  index: number;
}

interface BackendCameraSolution {
  orthoImagePath: string;
  orthoExtent: number[];
  reprojectionErrors: number[];
  meanError: number;
  cameraPosition: number[];
  cameraMatrix: number[][];
  type: string;
  uncertaintyEllipses?: Ellipse[];
  projectedPoints?: [number, number];
  pointIndices?: number[];
  numPoints?: number;
}

interface SetPointPixelCoordinatesProps {
    index: number;
    imageSize?: {
      width: number;
      height: number;
    };
    point?: {
      x: number;
      y: number;
    };
    clickIcon?: boolean;
  }

export type { Ipcam, CameraSolution, Ellipse, IpcamPoint, SetPointsPayload, SetImagesPayload, SetCustomPointPayload, BackendCameraSolution, SetPointPixelCoordinatesProps };