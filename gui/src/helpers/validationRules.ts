import { parseTime } from './formatTime';
import { frameRangeValid, parseInterval } from '../../commons/framesSource';

/**
 * Generates validation rules for video range inputs.
 *
 * @param t - Translation function for error messages.
 * @param getValues - Function to get form values.
 * @param duration - Maximum duration of the video in seconds.
 * @returns An object containing validation rules for start, end, and step inputs.
 *
 * The validation rules include:
 * - `start`:
 *   - Required field with a specific time format (MM:SS).
 *   - Validates that minutes and seconds are non-negative and seconds are less than 60.
 * - `end`:
 *   - Required field with a specific time format (MM:SS).
 *   - Validates that the end time is within the video duration, non-negative, non-zero, and greater than the start time.
 * - `step`:
 *   - Required field with a positive integer value.
 *   - Validates that the step value is greater than 0.
 */

export const getValidationRules = (t: any, getValues: any, duration: number) => {
  return {
    start: {
      required: t('VideoRange.Errors.required'),
      pattern: {
        value: /^\d{2}:\d{2}$/,
        message: t('VideoRange.Errors.formatInput'),
      },
      validate: (value: string) => {
        const [minutes, seconds] = value.split(':').map(Number);
        if (minutes < 0 || seconds < 0 || seconds >= 60) {
          return t('VideoRange.Errors.start1');
        }
        return true;
      },
    },
    end: {
      required: t('VideoRange.Errors.required'),
      pattern: {
        value: /^\d{2}:\d{2}$/,
        message: t('VideoRange.Errors.formatInput'),
      },
      validate: (value: string) => {
        const startTime = parseTime(getValues('start'));
        const endTime = parseTime(value);

        if (endTime > duration) {
          return t('VideoRange.Errors.end1');
        }

        if (endTime < 0) {
          return t('VideoRange.Errors.start1');
        }

        if (endTime === 0) {
          return t('VideoRange.Errors.end2');
        }

        if (endTime <= startTime) {
          return t('VideoRange.Errors.end3');
        }

        return true;
      },
    },
    step: {
      required: t('VideoRange.Errors.required'),
      pattern: {
        value: /^[1-9]\d*$/,
        message: t('VideoRange.Errors.step'),
      },
      validate: (value: number) => {
        if (value <= 0) {
          return t('VideoRange.Errors.step');
        }
        return true;
      },
    },
    distances: {
      required: t('ControlPoints.Errors.required'),
      validate: {
        notNull: (value: number) => value !== null || t('ControlPoints.Errors.notNull'),
        notZero: (value: number) => value !== 0 || t('ControlPoints.Errors.notZero'),
        positive: (value: number) => value > 0 || t('ControlPoints.Errors.positive'),
      },
    },
  };
};

/**
 * Video Range rules for a project made from a folder of frames: Start and End are
 * 1-based frame numbers, and the time between frames is editable.
 */
export const getFrameValidationRules = (t: any, getValues: any, count: number) => {
  const rangeError = () => t('VideoRange.Errors.frameRange', { count });
  return {
    start: {
      required: t('VideoRange.Errors.required'),
      // A Start that is merely past End is reported once, on End.
      validate: (value: string) => {
        const start = Number(value);
        return Number.isInteger(start) && start >= 1 && start < count ? true : rangeError();
      },
    },
    end: {
      required: t('VideoRange.Errors.required'),
      validate: (value: string) =>
        frameRangeValid(Number(getValues('start')), Number(value), count) ? true : rangeError(),
    },
    step: getValidationRules(t, getValues, 0).step,
    interval: {
      validate: (value: string) =>
        parseInterval(String(value)) !== null ? true : t('VideoRange.Errors.interval'),
    },
  };
};
