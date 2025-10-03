import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useTranslation } from 'react-i18next';
import {
  setActiveImage,
  setCameraSolution,
  setCustomPoint,
  setImages,
  setPoints,
} from '../store/ipcam/ipcamSlice';
import { CliError, ResourceNotFoundError } from '../errors/errors';
import { setHasChanged, setIsBackendWorking } from '../store/global/globalSlice';
import { BackendCameraSolution, SetPointPixelCoordinatesProps } from '../store/ipcam/types';
import { appendSolutionToIpcamPoints } from '../helpers/appendSolutionsToImportedPoints';
import { setDefaultSectionState } from '../store/section/sectionSlice';

export const useIpcamSlice = () => {
  // Get the dispatch function from the Redux store
  const dispatch = useDispatch();
  // Selectors to access specific parts of the Redux state
  // ipcam state handles everything related to ipcam mode
  const ipcam = useSelector((state: RootState) => state.ipcam);
  // Translation function from react-i18next
  const { t } = useTranslation();

  // Method to get points from a file path
  const onGetPoints = async (path?: string) => {
    // Access the ipcRenderer from the global window object
    const ipcRenderer = window.ipcRenderer;

    try {
      // Invoke the 'import-points' IPC channel with the provided path
      // Path can be undefined, which the main process should handle
      // Opening a dialog to select the file if path is undefined
      const { data, error } = await ipcRenderer.invoke('import-points', {
        path: path,
      });
      // If there's an error with a message, throw it to be caught below
      if (error?.message) {
        throw new Error(error.message);
      }
      // Dispatch actions to update the Redux state with the imported points
      dispatch(
        setPoints({
          points: data.points,
          path: data.path,
          counter: data.points.length,
          zLimits: data.zLimits,
        })
      );
      // Reset the camera solution in the matrix slice
      dispatch(setCameraSolution(null));
    } catch (error) {
      // If the error is an instance of Error, wrap it in a ResourceNotFoundError with translation
      if (error instanceof Error) {
        throw new ResourceNotFoundError(error.message, t);
      }
    }
  };

  // Method to get images from a folder path
  const onGetImages = async (folderPath?: string) => {
    // Access the ipcRenderer from the global window object
    const ipcRenderer = window.ipcRenderer;

    try {
      // Invoke the 'ipcam-images' IPC channel with the provided folder path
      // Folder path can be undefined, which the main process should handle
      // Opening a dialog to select the folder if folderPath is undefined
      const { images, path, error } = await ipcRenderer.invoke('ipcam-images', {
        folderPath,
      });
      // If there's an error, throw it to be caught below
      if (error) {
        throw new Error(error.message);
      }
      // Dispatch actions to update the Redux state with the imported images
      dispatch(
        setImages({
          images: images,
          path: path,
        })
      );
    } catch (error) {
      // If the error is an instance of Error, wrap it in a ResourceNotFoundError with translation
      if (error instanceof Error) {
        throw new ResourceNotFoundError(error.message, t);
      }
    }
  };

  // Method to change the selected state of points
  const onChangePointSelected = ({ index, rowsIndex }: { index?: number; rowsIndex?: number }) => {
    // desestructure points from ipcam state
    const { points } = ipcam;
    // If points is null, do nothing
    if (points === null) return;
    // Variable to track the change in selected points
    let value = 0;
    // If index is defined, toggle the selected state of the point at that index
    if (index !== undefined && index >= 0) {
      // Map through points and toggle the selected state of the point at the given index
      const newPoints = points.map((point, i) => {
        // If the current index matches the provided index
        // Toggle the selected state and adjust the value counter
        // If selecting, increment value; if deselecting, decrement value
        if (i === index) {
          if (point.selected === true) {
            value = -1;
            return { ...point, selected: !point.selected, image: null };
          } else {
            value = 1;
            return { ...point, selected: !point.selected };
          }
        }
        return point;
      });
      // Dispatch the updated points and the new selected counter to the Redux store
      // The counter is adjusted by the value calculated above
      dispatch(
        setPoints({
          points: newPoints,
          path: undefined,
          counter: ipcam.selectedCounter + value,
        })
      );
      // If rowsIndex is defined, it indicates a bulk select/deselect action
    } else if (rowsIndex !== undefined) {
      // Determine the value based on whether all points are currently selected
      // If all points are selected, value will be true (deselect all), otherwise false (select all)
      const value = rowsIndex === points.length ? true : false;
      // Only proceed if the current selection state differs from the desired state
      if (rowsIndex !== points.filter((v) => v.selected).length) {
        const newPoints = points.map((point) => {
          return { ...point, selected: value };
        });
        // Dispatch the updated points and the new selected counter to the Redux store
        // The counter is set to either the total number of points (if selecting all) or 0 (if deselecting all)
        dispatch(
          setPoints({
            points: newPoints,
            path: undefined,
            counter: value ? points.length : 0,
          })
        );
      }
    }
  };

  // Method to change the active image by index
  const onChangeActiveImage = (index: number) => {
    if (index !== ipcam.activeImage) {
      dispatch(setActiveImage(index));
    }
  };

  const onSetPointPixelCoordinates = ({ index, imageSize, point, clickIcon }: SetPointPixelCoordinatesProps) => {
    // desestructure points, activeImage, cameraSolution from ipcam state
    const { points, activeImage, cameraSolution } = ipcam;
    // If points is null, do nothing
    if (points === null) return;

    // Create a new point object with updated point
    let newPoint = { ...points[index] };

    // First case, when create a point in the center of the image
    if (newPoint.wasEstablished === false && imageSize) {
      newPoint.x = parseFloat((imageSize.width / 2).toFixed(1));
      newPoint.y = parseFloat((imageSize.height / 2).toFixed(1));

      dispatch(
        setCustomPoint({
          point: newPoint,
          index,
        })
      );
    }

    // Second case, when establish a point in a diferent position. Diferent related to center
    if (point) {
      newPoint.x = parseFloat(point.x.toFixed(1));
      newPoint.y = parseFloat(point.y.toFixed(1));
      newPoint.wasEstablished = true;
      newPoint.image = activeImage;

      dispatch(
        setCustomPoint({
          point: newPoint,
          index,
        })
      );
      // If there is a camera solution, reset it because a point has changed
      // And we need to recalculate the solution. Everthing change
      if (cameraSolution !== null) {
        dispatch(setCameraSolution(null));
        dispatch(setHasChanged(true));
      }
    }

    // Third case, when a point becomes selectionable and is already established. Don't change anything
    if (newPoint.wasEstablished === true && imageSize) {
      // TODO: Probar el no hacer nada
      dispatch(
        setCustomPoint({
          point: newPoint,
          index,
        })
      );
    }

    // Fourth case, when the point is established and the user only click the icon
    if (index !== undefined && clickIcon) {
      // TODO: Probar el no hacer nada
      dispatch(
        setCustomPoint({
          point: newPoint,
          index,
        })
      );
    }
  };

  const onGetCameraSolution = async (mode: string) => {
    // turn on the backend working flag
    dispatch(setIsBackendWorking(true));
    // Access the ipcRenderer from the global window object
    const ipcRenderer = window.ipcRenderer;

    try {
      const { data, error }: { data: BackendCameraSolution; error: any } = await ipcRenderer.invoke(
        'calculate-3d-rectification',
        {
          points: ipcam.points,
          mode,
        }
      );
      // Throw an error if there's an error message
      if (error) {
        throw new Error(error.message);
      }

      // Append the solution data to the imported points
      const { newPoints, numPoints } = appendSolutionToIpcamPoints(ipcam.points!, data, mode === 'direct-solve');
      // Remove large data from the solution before storing it in Redux
      // This keeps the Redux state lightweight and focused on essential data
      delete data.uncertaintyEllipses;
      delete data.projectedPoints;

      // Dispatch actions to update the Redux state with the new points and camera solution
      dispatch(
        setPoints({
          points: newPoints,
          path: undefined,
          counter: numPoints,
        })
      );
      dispatch(
        setCameraSolution({
          ...data,
          mode: mode,
          numPoints: numPoints,
        })
      );
      // Reset the section state to default
      dispatch(setDefaultSectionState());
    } catch (error) {
      // If the error is an instance of Error, wrap it in a CliError with translation
      if (error instanceof Error) {
        throw new CliError(error.message, t);
      }
    } finally {
      // turn off the backend working flag
      dispatch(setIsBackendWorking(false));
    }
  };

  return {
    // Atributes
    ...ipcam,

    // Methods
    onGetImages,
    onGetPoints,
    onChangeActiveImage,
    onChangePointSelected,
    onSetPointPixelCoordinates,
    onGetCameraSolution,
  };
};
