/**
 * Formats a given time in seconds into a string representation.
 *
 * @param {number | string} seconds - The time in seconds to format. Can be a number or a string.
 * @param {string} [format] - Optional format string. If 'mm:ss', the output will be in minutes and seconds.
 *                            Otherwise, the output will include minutes, seconds, and milliseconds.
 * @returns {string} The formatted time string.
 */

function formatTime(seconds: number | string, format?: string): string {
  if (typeof seconds === "string") {
    seconds = parseFloat(seconds);
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 100);
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");
  const formattedMilliseconds = String(milliseconds).padStart(2, "0");

  if (format === "mm:ss") {
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  return `${formattedMinutes}:${formattedSeconds}:${formattedMilliseconds}`;
}

/**
 * Converts a string in mm:ss format to a number of seconds.
 *
 * @param time - The string in mm:ss format.
 * @returns The number of seconds.
 */

function parseTime(time: string): number {
  const [minutes, seconds] = time.split(":").map(Number);
  return minutes * 60 + seconds;
}

/**
 * Identifies the format of the given time.
 *
 * @param {string} time - The time string to check.
 * @returns {string | boolean} 'mm:ss' if the time is in 'mm:ss' format, 'seconds' if it is a number, false otherwise.
 */

function identifyTimeFormat(time: string): string | boolean {
  const timeFormatRegex = /^\d{2}:\d{2}$/;
  const secondsFormatRegex = /^\d+(\.\d+)?$/;

  if (timeFormatRegex.test(time)) {
    return "mm:ss";
  } else if (secondsFormatRegex.test(time)) {
    return "seconds";
  } else {
    return false;
  }
}

export { formatTime, parseTime, identifyTimeFormat };
