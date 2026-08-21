import { getPointNames, getLabelStyle, getPointsDistances } from './hardModeFormHelpers';
import { getNewImageResolution } from './getNewImageResolution';
import { getValidationRules } from './validationRules';
import { formatTime, parseTime } from './formatTime';
import { adaptStringDate, dateToStringDate, recortStringDate, stringDateToDate } from './dateFunctions';
import { getUnit } from './unitSistem';
import { getDirectionVector } from './getDirectionVector';
import { computeStationPixelPositions, computeStationSearchLines, computeSearchLinesFromCenters } from './stationPositions';
import {
  getBathimetryValues,
  getIntersectionPoints,
  findWetSegments,
  buildWetSegmentsProfile,
} from './getBathimetryValues';
import { adapterCrossSections } from './adapterCrossSections';
import {
  adapterData,
  adapterBathimetry,
  generateXAxisTicks,
  generateYAxisTicks,
  getOrthoImageDimensions,
} from './graphsHelpers';
import { formatNumberToPrecision2, formatNumberToPrecision4, formatNumberTo2Decimals } from './adapterNumbers';
import { carouselClickImage, carouselKeyDown, setCarouselDimensions } from './carouselFunctions';
import { calculateArrowWidth, calculateMultipleArrowsAdaptative, getVelocityLimits } from './drawArrows';
import {
  createSquare,
  getObliquePointsDistances,
  adapterObliquePointsDistances,
  adjustCoordinates,
} from './useObliqueHelpers';
import {
  onLoadCrossSections,
  onLoadObliquePoints,
  onLoadPixelSize,
  onLoadProcessingForm,
  onLoadVideoParameters,
} from './loadProjectHelpers';
import { verifyWindowsSizes } from './verifyWindowsSizes';
import { getNewCanvasPositions, setChangesByForm } from './sectionsHelpers';
import getLineColor from './getLineColor';
import { getImageSize } from './getImageSize';
import { handleDragLeave, handleDragOver } from './handleDragEvents';
import { froudeFilledProfile, computeDischarge, getEffectiveTechniqueData } from './techniqueDischarge';
import type { Technique, DischargeResult, TechniqueDischargeData, TechniqueOptions } from './techniqueDischarge';

export type { Technique, DischargeResult, TechniqueDischargeData, TechniqueOptions };

export {
  adapterBathimetry,
  adapterCrossSections,
  adapterData,
  adapterObliquePointsDistances,
  adaptStringDate,
  adjustCoordinates,
  buildWetSegmentsProfile,
  calculateArrowWidth,
  calculateMultipleArrowsAdaptative,
  carouselClickImage,
  carouselKeyDown,
  computeDischarge,
  computeSearchLinesFromCenters,
  computeStationPixelPositions,
  computeStationSearchLines,
  createSquare,
  dateToStringDate,
  findWetSegments,
  formatNumberTo2Decimals,
  formatNumberToPrecision2,
  formatNumberToPrecision4,
  formatTime,
  froudeFilledProfile,
  generateXAxisTicks,
  generateYAxisTicks,
  getBathimetryValues,
  getEffectiveTechniqueData,
  getDirectionVector,
  getImageSize,
  getIntersectionPoints,
  getLabelStyle,
  getLineColor,
  getNewCanvasPositions,
  getNewImageResolution,
  getObliquePointsDistances,
  getOrthoImageDimensions,
  getPointNames,
  getPointsDistances,
  getUnit,
  getValidationRules,
  getVelocityLimits,
  handleDragLeave,
  handleDragOver,
  onLoadCrossSections,
  onLoadObliquePoints,
  onLoadPixelSize,
  onLoadProcessingForm,
  onLoadVideoParameters,
  parseTime,
  recortStringDate,
  setCarouselDimensions,
  setChangesByForm,
  stringDateToDate,
  verifyWindowsSizes,
};
