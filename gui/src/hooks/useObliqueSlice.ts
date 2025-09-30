import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { CanvasPoint, FormPoint, Point } from '../types';
import { ScreenSizes } from '../store/ui/types';
import {
  adapterObliquePointsDistances,
  adjustCoordinates,
  createSquare,
  getImageSize,
  getPointsDistances,
  setChangesByForm,
  transformPixelToRealWorld,
} from '../helpers';
import { resetAll, setHasChanged, setIsBackendWorking } from '../store/global/globalSlice';
import { setDrawPoints, setExtraFields, setObliquePoints } from '../store/oblique/obliqueSlice';
import { defaultCoordinates, defaultDistances } from '../store/oblique/types';
import { setDefaultSectionState, setTransformationMatrix } from '../store/section/sectionSlice';
import { CliError, ResourceNotFoundError } from '../errors/errors';
import { useTranslation } from 'react-i18next';
import { FieldValues } from 'react-hook-form';

// Hook to interact with the oblique slice state and actions
// This hook provides methods to update coordinates, fetch distances, and call the compute of oblique transformation matrix
// It also exposes the current state of the oblique slice for use in components
// such as coordinates, distances, and solution details

export const useObliqueSlice = () => {
  // dispatch function to send actions to the Redux store
  const dispatch = useDispatch();
  // Selectors to access specific parts of the Redux state
  // oblique state handles everything related to oblique mode
  const oblique = useSelector((state: RootState) => state.oblique);
  // global state handles application-wide flags
  const global = useSelector((state: RootState) => state.global);
  // Translation function from react-i18next
  const { t } = useTranslation();

  // Method to set coordinates based on two points and screen sizes
  // It creates a square from the two points, adjusts it according to screen factor,
  // and updates the oblique state with new coordinates
  const onSetCoordinatesCanvas = (points: Point[], screenSizes: ScreenSizes) => {
    // Destructure screen sizes
    // imageWidth and imageHeight are the dimensions of the image on screen
    // factor is the scaling factor between the original image size and actual image size
    const { imageWidth, imageHeight, factor } = screenSizes;

    // Create square coordinates from the two points
    let coordinates = createSquare(points[0], points[1], imageWidth!, imageHeight!);
    // Adjust coordinates based on the scaling factor
    coordinates = adjustCoordinates(coordinates, factor!);

    // Update the global state to indicate changes
    dispatch(setHasChanged(true));
    // Update the oblique state with new coordinates and set drawPoints to true
    // Also mark that the coordinates are no longer default
    dispatch(
      setObliquePoints({
        ...oblique,
        drawPoints: true,
        coordinates,
        isDefaultCoordinates: false,
      })
    );
    return;
  };

  // Method to handle changes in coordinates from a canvas point input
  // It adjusts the coordinates and updates the oblique state
  const onChangeCoordinates = (canvasPoint: CanvasPoint | null, formPoint: FormPoint) => {
    if (canvasPoint) {
      // Destructure points and factor from the canvasPoint input
      const { points, factor } = canvasPoint;
      // Adjust coordinates based on the scaling factor
      const coordinates = adjustCoordinates(points, factor);
      // Update global state to indicate changes
      dispatch(setHasChanged(true));
      // Update oblique state with new coordinates and mark them as non-default
      dispatch(
        setObliquePoints({
          ...oblique,
          coordinates,
          isDefaultCoordinates: false,
          solution: null, // Reset solution when coordinates change
        })
      );
      return;
    } 

    if (formPoint) {
      const { points } = setChangesByForm(formPoint, oblique.coordinates);
      
      dispatch(setHasChanged(true));
      dispatch(
        setObliquePoints({
          ...oblique,
          coordinates: points,
          isDefaultCoordinates: false,
          solution: null, // Reset solution when coordinates change
        })
      );
      return;
    }

  };
  // Method to toggle the drawPoints flag in the oblique state
  // This flag indicates whether points should be drawn on the image
  const onSetDrawPoints = () => {
    dispatch(setDrawPoints());
  };

  // Method to fetch distances from the backend via IPC
  // It can also reset distances if they are already loaded and no path is provided
  // On success, it updates the oblique state with the fetched distances
  // On failure, it throws a ResourceNotFoundError
  const onGetDistances = async (path?: string) => {
    // Access the ipcRenderer from the global window object
    const ipcRenderer = window.ipcRenderer;
    // Destructure isDistancesLoaded from oblique state
    const { isDistancesLoaded } = oblique;
    // If distances are already loaded and no path is provided, reset distances to default

    if (isDistancesLoaded && path === undefined) {
      dispatch(
        setObliquePoints({
          ...oblique,
          isDistancesLoaded: false,
          distances: defaultDistances,
          rwCoordinates: defaultCoordinates,
          solution: null,
        })
      );
      return;
    }
    try {
      // Open a dialog to select distances file if no path is provided
      const { distances: newDistances, error } = await ipcRenderer.invoke('import-distances', { path });

      // Handle errors from the IPC call
      // Error can be a wrong file format or user canceling the dialog
      // If not distances are loaded, we don't show any error to the user
      if (error) {
        throw new Error(error.message);
      }
      // New distances are loaded, so we need to reset the section state of next step
      dispatch(setDefaultSectionState());
      // Update global state to indicate changes and oblique state with new distances
      // So, we need to recalculate the oblique transformation matrix if already exists
      dispatch(setHasChanged(true));
      // Update oblique state with new distances and mark them as loaded
      dispatch(
        setObliquePoints({
          ...oblique,
          isDistancesLoaded: true,
          distances: newDistances,
          rwCoordinates: defaultCoordinates,
        })
      );
    } catch (error) {
      // Handle errors by throwing a ResourceNotFoundError with the error message
      if (error instanceof Error) {
        // Error message is translated here
        throw new ResourceNotFoundError(error.message, t);
      }
    }
  };
  // Method to compute the oblique transformation matrix via IPC
  // It checks if there are changes in distances or coordinates before making the call
  // On success, it updates the oblique state with the new transformation matrix and solution details
  // On failure, it throws a CliError with the error message
  const onGetObliqueTransformationMatrix = async (formDistances: FieldValues) => {
    // First, we check if there are changes in distances or coordinates
    dispatch(setIsBackendWorking(true));

    // Access the ipcRenderer from the global window object
    const ipcRenderer = window.ipcRenderer;

    // Destructure coordinates and distances from oblique state
    const { coordinates, distances } = oblique;
    // Parse and adapt distances from the form input
    // to match the expected format for the backend
    const newDistances = adapterObliquePointsDistances(formDistances);
    // Create a flag to track if there are changes
    // This flag is initially set to the global hasChanged state
    let changed = global.hasChanged;
    // Compare new distances with existing distances to detect changes
    for (const key in newDistances) {
      if (newDistances[key as keyof typeof newDistances] !== distances[key as keyof typeof distances]) {
        // If any distance value has changed, set the flag to true
        changed = true;
        break;
      }
    }
    // If nothing has changed, we skip the IPC call and reset the isBackendWorking flag
    // Is not necessary recalculate anything
    if (changed === false) {
      dispatch(setIsBackendWorking(false));
      return;
    }

    try {
      // Invoke the IPC method to compute the oblique transformation matrix
      // It sends the current coordinates and new distances to the backend
      const { obliqueMatrix, extent, resolution, roi, orthoImage, error } = await ipcRenderer.invoke(
        'set-control-points',
        {
          coordinates,
          distances: newDistances,
        }
      );
      // Handle errors from the IPC call
      // Error can be due to invalid inputs or backend processing issues
      // We throw a generic error here to be caught in the catch block
      if (error?.message) {
        throw new Error(error.message);
      }
      // If the call is successful, we update the oblique state with the new matrix and solution details
      // Including the ortho-rectified image and its dimensions
      let orthoImageWidth: number = 0;
      let orthoImageHeight: number = 0;

      // Get the size of the orthoImage to store it in the state
      // This is done asynchronously, so we await the result
      await getImageSize(orthoImage).then(({ width, height }) => {
        orthoImageWidth = width;
        orthoImageHeight = height;
      });

      // Calculate the real-world coordinates of the oblique points using the transformation matrix
      // These coordinates are useful for mapping and further processing
      // We transform each pixel coordinate to real-world using the obliqueMatrix
      const rwCoordinates = coordinates.map((point) => {
        const cord1 = transformPixelToRealWorld(point.x, point.y, obliqueMatrix);
        return { x: cord1[0], y: cord1[1] };
      });
      // Update the Redux store with the new transformation matrix, useful for the next steps.
      dispatch(setTransformationMatrix({ transformationMatrix: obliqueMatrix }));
      // Finally, we update the oblique state with all the new data
      dispatch(
        setObliquePoints({
          ...oblique,
          distances: newDistances,
          isDistancesLoaded: true,
          solution: { orthoImage, extent, resolution, roi, width: orthoImageWidth, height: orthoImageHeight },
          rwCoordinates: rwCoordinates,
        })
      );
      // Reset the global flags to indicate that changes have been processed
      dispatch(resetAll());
      // Reset the section state of next step
      dispatch(setDefaultSectionState());
    } catch (error) {
      // Handle errors by throwing a CliError with the error message
      if (error instanceof Error) {
        throw new CliError(error.message, t);
      }
    }
  };

  const onChangeExtraFields = () => {
    dispatch(setExtraFields())
  }

  const onChangeRealWorldCoordinates = (value: number, position: string) => {
    console.log('Change RW coordinate:', value, position);

    const { points } = setChangesByForm({ value, position }, oblique.rwCoordinates);

    const newDistances = getPointsDistances(points)

    dispatch(setHasChanged(true));
    dispatch(
      setObliquePoints({
        ...oblique,
        rwCoordinates: points,
        distances: newDistances,
        solution: null, // Reset solution when coordinates change
      })
    );
    return;
  }


  return {
    // ATRIBUTES
    ...oblique,

    // METHODS
    onChangeCoordinates,
    onChangeExtraFields,
    onGetDistances,
    onGetObliqueTransformationMatrix,
    onSetCoordinatesCanvas,
    onSetDrawPoints,
    onChangeRealWorldCoordinates,
  };
};
