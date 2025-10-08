import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { CanvasPoint, FormPoint, UpdatePixelSize } from '../types';
import { setPixelSizePoints, updatePixelSize } from '../store/uav/uavSlice';
import {
  computePixelSize,
  computeRwDistance,
  getImageSize,
  getLinesCoordinates,
  getNewCanvasPositions,
  setChangesByForm,
  transformPixelToRealWorld,
} from '../helpers';
import { setDefaultSectionState, setTransformationMatrix } from '../store/section/sectionSlice';
import { DEFAULT_POINTS } from '../constants/constants';
import { setHasChanged, setIsBackendWorking } from '../store/global/globalSlice';

export const useUavSlice = () => {
  const dispatch = useDispatch();
  const uav = useSelector((state: RootState) => state.uav);
  const { hasChanged } = useSelector((state: RootState) => state.global);

  const onGetUavTransformationMatrix = async () => {
    dispatch(setIsBackendWorking(true));

    const ipcRenderer = window.ipcRenderer;

    const { dirPoints, rwPoints, size, rwLength } = uav;

    if (hasChanged === false) {
      dispatch(setIsBackendWorking(false));
      return;
    }

    const args = {
      dirPoints,
      rwPoints,
      pixelSize: size,
      rwLength: rwLength,
    };

    try {
      const { uavMatrix, orthoImage, output_resolution, extent } = await ipcRenderer.invoke(
        'set-pixel-size',
        args
      );

      const secondPoint = transformPixelToRealWorld(dirPoints[1].x, dirPoints[1].y, uavMatrix);

      let orthoImageWidth: number = 0;
      let orthoImageHeight: number = 0;

      await getImageSize(orthoImage).then(({ width, height }) => {
        orthoImageWidth = width;
        orthoImageHeight = height;
      });

      dispatch(setTransformationMatrix({ transformationMatrix: uavMatrix }));
      dispatch(
        updatePixelSize({
          ...uav,
          solution: {
            orthoImage: orthoImage,
            resolution: output_resolution,
            extent: extent,
            secondPoint: { x: secondPoint[0], y: secondPoint[1] },
            width: orthoImageWidth,
            height: orthoImageHeight,
          },
        })
      );
      dispatch(setHasChanged(false));
      dispatch(setIsBackendWorking(false));
      dispatch(setDefaultSectionState());
    } catch (error) {
      console.log(error);
    }
  };

  const onSetPixelDirection = (canvasPoints: CanvasPoint | null, formPoint: FormPoint | null) => {
    const { dirPoints, rwPoints } = uav;

    /**
     * The flags are used to avoid unnecessary calculations
     * If flag1 is true, the first points is being modified
     * If flag2 is true, the second points is being modified
     */

    let flag1 = false;
    let flag2 = false;

    // The newPoints variable is used to store newPoints after the modification
    let newPoints;

    // If canvasPoints is null, the user is modifying the points manually.
    // Or creating a new line.
    if (canvasPoints) {
      const { points, firstFlag, secondFlag } = getNewCanvasPositions(canvasPoints, flag1, flag2);

      newPoints = points;
      flag1 = firstFlag;
      flag2 = secondFlag;
    }

    /**
     * If formPoint is not null, the real world coordinates are being modified by the user in the form.
     * The newPoints variable is calculated by updating the point in the position specified in the formPoint object.
     */

    if (formPoint) {
      const { points, firstFlag, secondFlag } = setChangesByForm(formPoint, dirPoints);
      newPoints = points;
      flag1 = firstFlag;
      flag2 = secondFlag;
    }

    // The new points are going to be stored in the state, if the points are diferent form the current points.

    if (newPoints) {
      if (newPoints[0].x === newPoints[1].x && newPoints[0].y === newPoints[1].y) {
        newPoints = dirPoints; // Revertir a los puntos originales
        flag1 = false;
        flag2 = false;
        dispatch(setPixelSizePoints({ points: newPoints, type: 'dir' }));
        dispatch(setHasChanged(true));
      } else {
        const { size } = computePixelSize(newPoints, rwPoints);
        dispatch(
          updatePixelSize({
            ...uav,
            dirPoints: newPoints,
            size,
            solution: null,
          })
        );
        dispatch(setHasChanged(true));
      }
    }

    return;
  };

  const onSetPixelRealWorld = (value: string | number, position: string) => {
    const { rwPoints } = uav;

    let newPoints;
    let flag1 = false;
    let flag2 = false;

    const { points, firstFlag, secondFlag } = setChangesByForm({ value, position }, rwPoints);
    
    newPoints = points;
    flag1 = firstFlag;
    flag2 = secondFlag;

    /**
     * The new real world coordinates are stored in the section slice.
     */

    if (newPoints) {
      if (newPoints[0].x === newPoints[1].x && newPoints[0].y === newPoints[1].y) {
        console.error('Los puntos no pueden ser iguales.');
        newPoints = rwPoints;
        flag1 = false;
        flag2 = false;
      } else {
        dispatch(setPixelSizePoints({ points: newPoints, type: 'rw' }));
        dispatch(setHasChanged(true));
      }
    }
  };

  const onUpdatePixelSize = (value: UpdatePixelSize) => {
    const { dirPoints } = uav;
    const updatedPixelSize = { ...uav };

    if (value.drawLine !== undefined) {
      updatedPixelSize.drawLine = !updatedPixelSize.drawLine;
      updatedPixelSize.dirPoints = [];
      updatedPixelSize.rwPoints = DEFAULT_POINTS;
      updatedPixelSize.size = 0;
      updatedPixelSize.rwLength = 0;
      updatedPixelSize.solution = null;
    }

    if (value.length !== undefined) {
      const resetRealWorld = [
        { x: 0, y: 0 },
        { x: value.length, y: 0 },
      ];
      const { size, rwLength } = computePixelSize(dirPoints, resetRealWorld);
      updatedPixelSize.size = size;
      updatedPixelSize.rwLength = rwLength;
      updatedPixelSize.rwPoints = resetRealWorld;
      updatedPixelSize.solution = null;
    }

    if (value.pixelSize !== undefined) {
      if ((dirPoints[0] === DEFAULT_POINTS[0] && dirPoints[1] === DEFAULT_POINTS[1]) || dirPoints.length === 0) {
        const newDirPoints = getLinesCoordinates(value.imageWidth!, value.imageHeight!);
        const rwLength = computeRwDistance(newDirPoints, value.pixelSize);
        updatedPixelSize.dirPoints = newDirPoints;
        updatedPixelSize.size = value.pixelSize;
        updatedPixelSize.rwLength = rwLength;
        updatedPixelSize.rwPoints = [
          { x: 0, y: 0 },
          { x: rwLength, y: 0 },
        ];
        updatedPixelSize.drawLine = true;
        updatedPixelSize.solution = null;
      } else {
        const rwLength = computeRwDistance(dirPoints, value.pixelSize);
        updatedPixelSize.size = value.pixelSize;
        updatedPixelSize.rwLength = rwLength;
        updatedPixelSize.rwPoints = [
          { x: 0, y: 0 },
          { x: rwLength, y: 0 },
        ];
        updatedPixelSize.solution = null;
      }
    }

    if (value.extraFields !== undefined) {
      updatedPixelSize.extraFields = !updatedPixelSize.extraFields;
    }
    dispatch(updatePixelSize(updatedPixelSize));
    dispatch(setHasChanged(true));
  };

  return {
    // ATRIBUTES
    ...uav,

    // METHODS

    onGetUavTransformationMatrix,
    onSetPixelDirection,
    onSetPixelRealWorld,
    onUpdatePixelSize,
  };
};
