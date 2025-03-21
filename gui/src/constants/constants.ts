/**
 * Footage Types
 */

export const FOOTAGE_TYPES = {
  IPCAM: "ipcam",
  OBLIQUE: "oblique",
  UAV: "uav",
};

/**
 * Image Width factor
 */

export const IMAGE_WIDTH_FACTOR = 0.62;

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
  REPORT: 8,
  RESULTS: 7,
  ANALIZING: 6,
  PROCESSING: 5,
  CROSS_SECTIONS: 4,
  PIXEL_SIZE: 3,
  VIDEO_RANGE: 2,
};

/**
 * Colors
 */
export const COLORS = {
  RED: "#ED6B57",
  GREEN: "#62C655",
  YELLOW: "#F5BF61",
  BLUE: "#0678BE",
  BLUE_WITH_TRANSPARENCY: "#0678BE95",
  LIGHT_BLUE: "#6CD4FF",
  DARK_GREY: "#545454",
  WHITE: "#FFFFFF",
  BLACK: "#000000",
  TRANSPARENT_WHITE: "#FFFFFF80", // 50% opacity
  TRANSPARENT: "#00000000", // fully transparent
  PERCENTILE_AREA: "#ED6B5740",
  STD_AREA: "#62C65533", // 'rgba(98, 198, 85, 0.2)'
  MARK_NUMBER: "#3396BF",
  MARK_L: "#6B120B",
  MARK_R: "#2D671B",
  CONTROL_POINTS: {
    D12: "#6CD4FF",
    D13: "#CC4BC2",
    D14: "#F5BF61",
    D23: "#62C655",
    D24: "#7765E3",
    D34: "#ED6B57",
  },
  ELLIPSE: {
    FILL: "#D2AF7970",
    STROKE: "#D2AF79",
  },
};

/**
 * Constants for GRAPHS
 */
export const GRAPHS = {
  BAR_PADDING: 5,
  WIDTH_PROPORTION: 0.22,
  MIN_WIDTH: 375,
  GRID_Y_OFFSET_ALL_IN_ONE: 35,
  IPCAM_GRID_PROPORTION: 0.27,
  IPCAM_GRID_PADDING: 10,
  GRID_Y_OFFSET_BATHIMETRY: 10,
  PLOT_TEST_PROPORTION: 0.23,
  ORTHO_IMAGE_MAX_HEIGHT: 450,
  CROSS_LENGTH: 8,
};

/**
 * Quiver y Velocity Vectoy
 */
export const VECTORS = {
  VELOCITY_AMPLITUDE_FACTOR: 20,
  QUIVER_AMPLITUDE_FACTOR: 10,
};

/**
 * Constants for marks
 */

export const MARKS = {
  WIDTH: 40,
  HEIGHT: 40,
  OFFSET_X: 20,
  OFFSET_Y: 39,
  NUMBER_OFFSET_X: 5,
  NUMBER_OFFSET_Y: 35,
  NUMBER_FONT_SIZE: 17,
  LETTER_FONT_SIZE: 15,
  WIDTH_REPORT: 25,
  HEIGHT_REPORT: 25,
  OFFSET_X_REPORT: 12,
  OFFSET_Y_REPORT: 25,
  NUMBER_OFFSET_X_REPORT: 2.5,
  NUMBER_OFFSET_Y_REPORT: 14,
};

/**
 * Velocity Vector Section Report Sizes
 */

export const REPORT_IMAGES = {
  IMAGES_WIDTH: 400,
  IMAGES_HEIGHT: 225,
  IMAGES_IPCAM_WIDTH: 500,
  IMAGES_IPCAM_HEIGHT: 281.25,
  VELOCITY_VECTOR_RESIZE_FACTOR: 4.8,
  VELOCITY_VECTOR_AMPLITUDE_FACTOR: 40,
};

export const WINDOW_SIZES = {
  BIG: 512,
  MEDIUM: 256,
  SMALL: 128,
  TINY: 64,
};

export const UNITS = {
  SI: {
    FLOW: "m³/s",
    LONGITUDE: "m",
    AREA: "m²",
    VELOCITY: "m/s",
  },
  IMPERIAL: {
    FLOW: "cfs",
    LONGITUDE: "ft",
    AREA: "ft²",
    VELOCITY: "ft/s",
  },
};
