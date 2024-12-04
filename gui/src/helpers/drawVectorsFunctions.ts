import { color } from "d3";
import { transformRealWorldToPixel } from "./coordinates";

/**
 * Calculates the width of an arrow based on the differences between consecutive distances.
 * 
 * @param {number[]} distances - An array of distances.
 * @returns {void} This function does not return a value. It logs the calculated arrow width to the console.
 * 
 * The function works by:
 * 1. Calculating the differences between consecutive distances.
 * 2. Computing the mean of these differences.
 * 3. Multiplying the mean difference by 0.8 to get the arrow width.
 * 4. Return the arrow width.
 */
function calculateArrowWidth(distances: number[]) : number {
    let differences = [];
    for (let i = 1; i < distances.length; i++) {
        differences.push(distances[i] - distances[i - 1]);
    }

    let meanDifference = differences.reduce((acc, val) => acc + val, 0) / differences.length;

    let arrow_width = 0.8 * meanDifference;

    return arrow_width;
}

// Calculate corners for arrow with base centered on point.

/**
 * Calculates the coordinates of the corners of an arrow pointing from one point to another.
 *
 * @param east_c - The east coordinate of the current point.
 * @param north_c - The north coordinate of the current point.
 * @param east_next - The east coordinate of the next point.
 * @param north_next - The north coordinate of the next point.
 * @param height - The height of the arrow.
 * @param width - The width of the arrow. Defaults to 0.5.
 * @returns An array of arrays:  containing two arrays: the first array contains the east coordinates of the arrow's corners, 
 *          and the second array contains the north coordinates of the arrow's corners.
 *
 * The function calculates the direction vector from the current point to the next point, normalizes it, 
 * and then computes an orthogonal vector to determine the arrow's width. It then calculates the coordinates 
 * of the arrow's corners, including the arrow tip, and returns them.
 */

function calculateArrow( east_c: number, north_c: number, east_next: number, north_next: number, height: number, width = 0.5 ){
    //  Vector to next point

    let dx = east_next - east_c;
    let dy = north_next - north_c;
    const length = Math.sqrt(dx ** 2 + dy ** 2);
    dx = dx / length;
    dy = dy / length;   

    // Orthogonal vector

    let ox = -dy
    let oy = dx

    let tip_extension = 1.2 * ((width ** 2) - (width / 2) ** 2) ** 0.5
    let total_height = height + Math.sign(height) * tip_extension;


    const corners_east = [
        east_c - (width / 2) * dx,  // base left
        east_c - (width / 2) * dx + height * ox,  // top left
        east_c + total_height * ox,  // arrow tip
        east_c + (width / 2) * dx + height * ox,  // top right
        east_c + (width / 2) * dx,  // base right
        east_c - (width / 2) * dx  // back to start
    ]

    const corners_north = [
        north_c - (width / 2) * dy,  // base left
        north_c - (width / 2) * dy + height * oy,  // top left
        north_c + total_height * oy,  // arrow tip
        north_c + (width / 2) * dy + height * oy,  // top right
        north_c + (width / 2) * dy,  // base right
        north_c - (width / 2) * dy  // back to start
    ]

    return [ corners_east, corners_north ]
}

/**
 * Calculates and transforms multiple arrows based on the given parameters.
 *
 * @param {number[]} east - Array of east coordinates.
 * @param {number[]} north - Array of north coordinates.
 * @param {number[]} magnitudes - Array of magnitudes for each vector.
 * @param {number[][]} transformationMatrix - Matrix used to transform real-world coordinates to pixel coordinates.
 * @param {number} videoHeight - Height of the video/image to scale the arrows appropriately.
 * @param {number} [arrowWidth=0.5] - Width of the arrows (optional, default is 0.5).
 * @returns {Array} An array of arrow objects, each containing transformed points and color.
 *
 * The function performs the following steps:
 * 1. Filters out invalid magnitudes (null or NaN) and stores the indices of valid entries.
 * 2. If no valid magnitudes are found, returns an empty array and a default point.
 * 3. Creates a custom color map for coloring the arrows.
 * 4. Filters the east, north, and magnitudes arrays based on valid indices.
 * 5. Calculates the next east and north coordinates for each valid index.
 * 6. Determines the maximum length of the transformed arrows to scale them appropriately.
 * 7. Scales the arrows based on the target maximum length and the transformed maximum length.
 * 8. Normalizes the magnitudes for color mapping.
 * 9. Calculates the arrow points and transforms them to pixel coordinates.
 * 10. Assigns a color to each arrow based on the normalized magnitude.
 * 11. Returns an array of arrow objects, each containing the transformed points and color.
 */

function calculateMultipleArrows( east: number[], north: number[], magnitudes: (number | null)[], transformationMatrix: number[][], videoHeight: number, arrowWidth: number = 0.5,  ): Array<any> {
    
    let validIndices: number[] = [];

    for (let i = 0; i < magnitudes.length; i++) {
        if ( magnitudes[i] !== null && !isNaN(magnitudes[i] as number)) {
            validIndices.push(i);
        }
    }
    
    // validIndices = validIndices.slice(0, -1);

    if (validIndices.length === 0) {
        return [[], [0, 0]];
    }

    const customColorMap = createColorMap()
    
    const east_filtered = east.map((value, i)=> {
        if ( validIndices.includes(i) ) {
            return value;
        } else {
            return 0
        }
    });
    const north_filtered = north.map((value, i) => {
        if ( validIndices.includes(i) ) {
            return value;
        } else {
            return 0
        }
    });
    const magnitudes_filtered = magnitudes.map((value, i) => {
        if ( validIndices.includes(i) ) {
            return value;
        } else {
            return 0
        }
    });
    const east_next = east.map((_value, i) => {
        if ( validIndices.includes(i) ) {
            return east[i + 1];
        } else {
            return 0
        }
    });
    const north_next = north.map((_value, i) => {
        if ( validIndices.includes(i) ) {
            return north[i + 1];
        } else {
            return 0
        }
    });


    const targetMaxLength = videoHeight / 5; // image height
    
    let transformedMaxLength = 0


    for (let i = 0; i < magnitudes_filtered.length; i++) {
        const base = transformRealWorldToPixel(east_filtered[i], north_filtered[i], transformationMatrix)

        
        const tip = transformRealWorldToPixel(
            east_filtered[i] + magnitudes_filtered[i] * (- north_next[i] + north_filtered[i]),
            north_filtered[i] + magnitudes_filtered[i] * (east_next[i] - east_filtered[i]),
            transformationMatrix
        ) 
        
        // Calculate the distance between the base and the tip of the arrow
        const length = Math.sqrt(Math.pow(tip[0] - base[0], 2) + Math.pow(tip[1] - base[1], 2));;

        transformedMaxLength = Math.max(transformedMaxLength, length);
    }

    const scaleFactor = transformedMaxLength > 0 ? targetMaxLength / transformedMaxLength : 1.0;

    let arrows = []
    let min_magnitude = Math.min(...magnitudes_filtered.filter(value => value !== 0));
    let max_magnitude = Math.max(...magnitudes_filtered.filter(value => value !== 0));
    const norm = new Normalize(min_magnitude, max_magnitude);


    for ( let i = 0; i < magnitudes_filtered.length; i++ ) {

        if ( magnitudes_filtered[i] === 0 ){
            arrows.push(
                {
                    points: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
                    color: 'transparent'
                }
            )
            continue
        };

        const [corners_east, corners_north] = calculateArrow(east_filtered[i], north_filtered[i], east_next[i], north_next[i], magnitudes_filtered[i] * scaleFactor, arrowWidth);

        const transformedPoints = corners_east.map((e: number, index: number) => 
            transformRealWorldToPixel(e, corners_north[index], transformationMatrix)
        );

        const normalizedValue = norm.normalize(magnitudes_filtered[i]);
        let colorIndex = parseInt( normalizedValue * 255 + "" );
        colorIndex = Math.min( Math.max(0, colorIndex), 255 ); 

        const color = customColorMap[colorIndex];


        arrows.push({
            points: transformedPoints,
            color: color
        });
    }

    return arrows
}


/**
 * Generates a custom colormap with a smooth gradient transition between predefined colors.
 *
 * The colormap is created by interpolating between the following colors:
 * - Light Blue (Lowest)
 * - Green (Low-mid)
 * - Orange-Yellow (Mid-high)
 * - Red-Orange (Highest)
 *
 * The function uses 256 bins to create a smooth gradient transition.
 *
 * @returns {string[]} An array of RGB color strings representing the custom colormap.
 */

function createColorMap(){
    const colors = [
        [ 108, 212, 255], // Light Blue - Lowest
        [ 98, 198, 85 ],  // Green - Low-mid
        [245, 191, 97],  // Orange-Yellow - Mid-high
        [237, 107, 87]  //Red-Orange - Highest
    ]

    const nBins = 256
    const colorPositions = linespace(0, 1, colors.length)

    const R = zeros(nBins)
    const G = zeros(nBins)
    const B = zeros(nBins)

    const linspaceBins = linespace(0, 1, nBins);

     // For each color segment
     for (let i = 0; i < colors.length - 1; i++) {
        // Find indices for this segment
        const mask = linspaceBins.map(value => value >= colorPositions[i] && value <= colorPositions[i + 1]);

        // Calculate position within segment
        const segmentPositions = linespace(0, 1, mask.filter(Boolean).length);

        // Interpolate each channel
        let segmentIndex = 0;
        for (let j = 0; j < nBins; j++) {
            if (mask[j]) {
                R[j] = interpolate(segmentPositions[segmentIndex], 0, 1, colors[i][0], colors[i + 1][0]);
                G[j] = interpolate(segmentPositions[segmentIndex], 0, 1, colors[i][1], colors[i + 1][1]);
                B[j] = interpolate(segmentPositions[segmentIndex], 0, 1, colors[i][2], colors[i + 1][2]);
                segmentIndex++;
            }
        }
    }

    // Create the colormap
    const customCmap = R.map((_, i) => `rgb(${R[i]}, ${G[i]}, ${B[i]})`);

    return customCmap
}

/**
 * Generates a sequence of equally spaced numbers over a specified range.
 *
 * @param start - The start value of the sequence.
 * @param end - The end value of the sequence.
 * @param num - The number of values to generate.
 * @returns An array of equally spaced numbers.
 */

function linespace (start: number, end: number, n: number ) {
    const step = (end - start) / (n - 1);
    return Array.from({ length: n }, (_, i) => start + step * i);
}


/**
 * Generates an array of zeros with the specified length.
 *
 * @param length - The length of the array.
 * @returns An array of zeros.
 */
function zeros(length: number): number[] {
    return Array.from({ length }, () => 0);
}


/**
 * Interpolates a value within a range.
 *
 * @param x - The value to interpolate.
 * @param x0 - The start of the range.
 * @param x1 - The end of the range.
 * @param y0 - The value at the start of the range.
 * @param y1 - The value at the end of the range.
 * @returns The interpolated value.
 */
function interpolate(x: number, x0: number, x1: number, y0: number, y1: number): number {
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

/**
 * Class representing a normalization utility.
 */
class Normalize {
    /**
     * The minimum value of the range.
     */
    vmin: number;

    /**
     * The maximum value of the range.
     */
    vmax: number;

    /**
     * Create a Normalize instance.
     * @param vmin - The minimum value of the range.
     * @param vmax - The maximum value of the range.
     */
    constructor(vmin: number, vmax: number) {
        this.vmin = vmin;
        this.vmax = vmax;
    }

    /**
     * Normalize a given value within the specified range.
     * @param value - The value to be normalized.
     * @returns The normalized value as a number between 0 and 1.
     */
    normalize(value: number): number {
        return (value - this.vmin) / (this.vmax - this.vmin);
    }
}

export { calculateArrowWidth, calculateMultipleArrows}