/**
 * Verifies the window sizes based on the provided step and bounding box (bbox).
 *
 * @param step1 - The step value to compare against the minimum value derived from bbox.
 * @param bbox - An array representing the bounding box or a boolean indicating if bbox is not defined.
 *               If bbox is an array, the last two elements are used to calculate the minimum value.
 *               If bbox is false, it indicates that bbox is not defined.
 * @returns An object with a message property:
 *          - 'bboxNotDefined' if bbox is false.
 *          - 'windowsSizesError' if the calculated minimum value is less than step1.
 *          - undefined if the minimum value is greater than or equal to step1.
 */
function verifyWindowsSizes(
  step1: number,
  bbox: number[] | boolean,
): { message: string } | undefined {
  if (bbox === false) {
    return {
      message: "bboxNotDefined",
    };
  }

  let minValue = 0;
  if (Array.isArray(bbox)) {
    minValue = Math.min(...bbox.slice(-2)) / 1.5;
  }

  if (minValue < step1) {
    return {
      message: "windowsSizesError",
    };
  }

  return;
}

export { verifyWindowsSizes };
