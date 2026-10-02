/**
 * Footage Types
 */

export const FOOTAGE_TYPES = {
  IPCAM: 'ipcam',
  OBLIQUE: 'oblique',
  UAV: 'uav',
};

/**
 * Image Width factor
 */

export const IMAGE_WIDTH_FACTOR = 0.62;

/**
 *  Next both factors are used to calculate the new image resolution, when the image resolution
 *  is vertical.
 */
export const IMAGE_HEIGHT_FACTOR = 0.9;
export const IMAGE_HEIGHT_REDUCED_FACTOR = 0.64;

/**
 * Default section
 */

export const DEFAULT_ALPHA = 0.85;
export const DEFAULT_NUM_STATIONS = 15;
export const DEFAULT_POINTS = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];

/**
 * This file contains all the constants used in the front application
 */

export const MODULE_NUMBER = {
  REPORT: 7,
  RESULTS: 6,
  PROCESSING: 5,
  CROSS_SECTIONS: 4,
  PIXEL_SIZE: 3,
  VIDEO_RANGE: 2,
};

/**
 * Colors
 */
export const COLORS = {
  RED: '#ED6B57',
  GREEN: '#62C655',
  YELLOW: '#F5BF61',
  BLUE: '#0678BE',
  BLUE_WITH_TRANSPARENCY: '#0678BE95',
  LIGHT_BLUE: '#6CD4FF',
  DARK_GREY: '#545454',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  TRANSPARENT_WHITE: '#FFFFFF80', // 50% opacity
  TRANSPARENT: '#00000000', // fully transparent
  PERCENTILE_AREA: '#ED6B5766', // ~40% opacity – boosted from 25% for dark bg
  PERCENTILE_STROKE: '#ED6B5799', // boundary edge stroke ~60% opacity
  STD_AREA: '#62C65550', // ~31% opacity – boosted from 20% for dark bg
  STD_STROKE: '#62C65599', // boundary edge stroke ~60% opacity
  MARK_NUMBER: '#3396BF',
  MARK_L: '#6B120B',
  MARK_R: '#2D671B',
  ELLIPSE: {
    FILL: '#D2AF7970',
    STROKE: '#D2AF79',
  },
};

/**
 * Constants for GRAPHS
 */
export const GRAPHS = {
  BAR_PADDING: 5,
  WIDTH_PROPORTION: 0.22,
  MAX_BATHIMETRY_WIDTH: 500,
  MIN_WIDTH: 375,
  GRID_Y_OFFSET_ALL_IN_ONE: 35,
  IPCAM_GRID_PROPORTION: 0.26,
  IPCAM_GRID_PADDING: 10,
  GRID_Y_OFFSET_BATHIMETRY: 10,
  PLOT_TEST_PROPORTION: 0.23,
  ORTHO_IMAGE_MAX_HEIGHT: 450,
  ORTHO_IMAGE_MIN_WIDTH: 350,
  CROSS_LENGTH: 8,
};

/**
 * Quiver y Velocity Vectoy
 */
export const VECTORS = {
  VELOCITY_AMPLITUDE_FACTOR: 10,
  QUIVER_AMPLITUDE_FACTOR: 10,
};

/**
 * Fallback STIV sampling height in metres, used only when the processing form's
 * ROI Height is unset (0). Mirrors the CLI's `--height-roi-stiv` default, so the
 * drawn search-line preview matches what the backend will actually sample in that
 * case — the GUI omits the flag when ROI Height is 0, letting the CLI default apply.
 */
export const STIV_DEFAULT_HEIGHT_ROI_M = 6.0;

/**
 * Constants for marks
 */

export const MARKS = {
  STROKE_WIDTH: 3,
};

/** Exported report: images are re-encoded to WebP at this quality and width cap. */
export const REPORT_SHEET = {
  IMAGE_QUALITY: 0.8,
  IMAGE_MAX_WIDTH: 1600,
};

/**
 * Compact report flow (spec §8). A4 at 96 dpi is 794 × 1123 px; with 11 mm top padding and the
 * footer (~48 px incl. its 8 mm bottom margin) a page body is ~1033 px tall; BODY_HEIGHT keeps
 * a small safety margin. The page body is 186 mm (~703 px) wide.
 */
export const REPORT_FLOW = {
  BODY_HEIGHT: 1020,
  GAP: 10,
  FRAME_WIDTH: 300,
  FRAME_MAX_HEIGHT: 200,
  PLOT_WIDTH: 380,
  PLOT_HEIGHT: 196,
  TABLE_COLUMNS: 3,
  /** Stations shown inside the section block itself (three columns of 16). */
  FIRST_CHUNK_STATIONS: 48,
  /** Stations per table-continuation block (three columns of 53), so the block fits one page body. */
  CONTINUATION_CHUNK_STATIONS: 159,
  /** Approximate station table row height and block overhead in px, measured in headless Chrome. */
  TABLE_ROW_HEIGHT: 17,
  TABLE_BLOCK_OVERHEAD: 80,
  METHOD_IMAGE_WIDTH: 140,
  /** Snapshot strip image width; matches the five-column grid in report.css. */
  STRIP_IMAGE_WIDTH: 112,
  /** Used for a block until its height has been measured once. */
  FALLBACK_BLOCK_HEIGHT: 400,
};

export const WINDOW_SIZES = {
  BIG: 512,
  MEDIUM: 256,
  SMALL: 128,
  TINY: 64,
};

export const UNIT_CONVERSIONS = {
  FT_TO_M: 0.3048,
  M_TO_FT: 1 / 0.3048,
  M3_TO_FT3: 35.3147,
};

export const UNITS = {
  SI: {
    FLOW: 'm³/s',
    LONGITUDE: 'm',
    AREA: 'm²',
    VELOCITY: 'm/s',
  },
  IMPERIAL: {
    FLOW: 'cfs',
    LONGITUDE: 'ft',
    AREA: 'ft²',
    VELOCITY: 'ft/s',
  },
};
