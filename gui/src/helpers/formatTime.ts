/**
 * Formats a given time in seconds into a string representation.
 *
 * @param {number | string} seconds - The time in seconds to format. Can be a number or a string.
 * @param {string} [format] - Optional format string. If 'mm:ss', the output will be in minutes and seconds.
 *                            Otherwise, the output will include minutes, seconds, and milliseconds.
 * @returns {string} The formatted time string.
 */

function formatTime(seconds: number | string, format?: string): string {
    if (typeof seconds === 'string') {
      seconds = parseFloat(seconds);
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 100);
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    const formattedMilliseconds = String(milliseconds).padStart(2, '0');
    
    if ( format === 'mm:ss'){
        return `${formattedMinutes}:${formattedSeconds}`;
    }
  
  
    return `${formattedMinutes}:${formattedSeconds}:${formattedMilliseconds}`;
}

/**
 * Convierte una cadena en formato mm:ss a un número de segundos.
 *
 * @param time - La cadena en formato mm:ss.
 * @returns El número de segundos.
 */

function parseTime(time: string): number{
    const [minutes, seconds] = time.split(':').map(Number);
    return (minutes * 60) + seconds;
}

export { formatTime, parseTime };