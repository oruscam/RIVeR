import { getPointNames, getLabelStyle, getPointsDistances } from './hardModeFormHelpers';
import { getNewImageResolution } from './getNewImageResolution';
import { getValidationRules } from './validationRules';
import { formatTime, parseTime } from './formatTime';
import { adaptStringDate, dateToStringDate, recortStringDate, stringDateToDate } from './dateFunctions';
import { getUnit } from './unitSistem';
import { getDirectionVector } from './getDirectionVector';
import { applyStepLeaveEffects, getStepLeaveEffect } from './stepLeaveEffects';
import type { StepLeaveHandlers } from './stepLeaveEffects';
import { buildStepperContent } from './stepperContent';
import type { StepperContent, StepperStep, StepStatus } from './stepperContent';
import { isLowConfidence } from './lowConfidence';
import {
  computeStationPixelPositions,
  computeStationSearchLines,
  computeSearchLinesFromCenters,
  getSectionSearchLines,
  searchLineCenters,
  interpolateStationCenters,
} from './stationPositions';
import { isPixelHidden, isSegmentMasked, isWindowMasked } from './maskCoverage';
import type { MaskRaster } from './maskCoverage';
import { loadMaskRaster } from './loadMaskRaster';
import { measureImageAspect } from './measureImageAspect';
import { getStiColorScale, STI_FALLBACK_COLOR } from './stiColorScale';
import type { StiColorScale } from './stiColorScale';
import {
  ANGLE_MAX,
  ANGLE_MIN,
  ANGLE_WARN_HIGH,
  ANGLE_WARN_LOW,
  angleFromPointer,
  clampAngle,
  clearAllOverrides,
  clearOverride,
  hasAnyOverride,
  isAnglePoorlyConstrained,
  isStationTuned,
  mergeAngleProfile,
  mergedSigmaProfile,
  mergedVelocityProfile,
  metersPerSlope,
  nextAngleFromSlider,
  setOverride,
  thetaToSign,
  thetaToVelocity,
} from './stivAngle';
import type { StivSign } from './stivAngle';
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
  flowDirection,
  chevronCount,
  formatSignedVelocity,
  PITCH_FRACTION,
  MAX_CHEVRON_COUNT,
  THICKNESS_FACTOR,
  WING_SPAN,
  DEFAULT_PERIOD_S,
} from './chevronGlyph';
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
import {
  curveToPath,
  describeSpectrumPoint,
  fromPixel,
  getCellExtent,
  getNearestIndex,
  getRampColor,
  getSpectrumPixels,
  getTicks,
  parseColor,
  toPixel,
} from './spectrumGeometry';
import type { RgbColor, SpectrumAxis, SpectrumPoint } from './spectrumGeometry';

export type {
  MaskRaster,
  StiColorScale,
  StepLeaveHandlers,
  StepperContent,
  StepperStep,
  StepStatus,
  StivSign,
  Technique,
  DischargeResult,
  TechniqueDischargeData,
  TechniqueOptions,
  RgbColor,
  SpectrumAxis,
  SpectrumPoint,
};

export {
  adapterBathimetry,
  adapterCrossSections,
  adapterData,
  adapterObliquePointsDistances,
  adaptStringDate,
  adjustCoordinates,
  ANGLE_MAX,
  ANGLE_MIN,
  ANGLE_WARN_HIGH,
  ANGLE_WARN_LOW,
  angleFromPointer,
  applyStepLeaveEffects,
  buildStepperContent,
  buildWetSegmentsProfile,
  calculateArrowWidth,
  calculateMultipleArrowsAdaptative,
  carouselClickImage,
  carouselKeyDown,
  chevronCount,
  clampAngle,
  clearAllOverrides,
  clearOverride,
  computeDischarge,
  computeSearchLinesFromCenters,
  getSectionSearchLines,
  searchLineCenters,
  interpolateStationCenters,
  isPixelHidden,
  isSegmentMasked,
  isWindowMasked,
  loadMaskRaster,
  measureImageAspect,
  computeStationPixelPositions,
  computeStationSearchLines,
  curveToPath,
  describeSpectrumPoint,
  fromPixel,
  getCellExtent,
  getNearestIndex,
  getRampColor,
  getSpectrumPixels,
  getTicks,
  parseColor,
  toPixel,
  createSquare,
  DEFAULT_PERIOD_S,
  dateToStringDate,
  findWetSegments,
  flowDirection,
  formatNumberTo2Decimals,
  formatNumberToPrecision2,
  formatNumberToPrecision4,
  formatSignedVelocity,
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
  getStepLeaveEffect,
  getStiColorScale,
  getUnit,
  getValidationRules,
  getVelocityLimits,
  handleDragLeave,
  handleDragOver,
  hasAnyOverride,
  isAnglePoorlyConstrained,
  isLowConfidence,
  isStationTuned,
  MAX_CHEVRON_COUNT,
  mergeAngleProfile,
  mergedSigmaProfile,
  mergedVelocityProfile,
  metersPerSlope,
  nextAngleFromSlider,
  onLoadCrossSections,
  onLoadObliquePoints,
  onLoadPixelSize,
  onLoadProcessingForm,
  onLoadVideoParameters,
  parseTime,
  PITCH_FRACTION,
  recortStringDate,
  setCarouselDimensions,
  setChangesByForm,
  setOverride,
  STI_FALLBACK_COLOR,
  stringDateToDate,
  thetaToSign,
  thetaToVelocity,
  THICKNESS_FACTOR,
  verifyWindowsSizes,
  WING_SPAN,
};
