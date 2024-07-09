interface Points {
    x: number;
    y: number;
}

// * Calculate and return the Euclidean distance between two points.

function getDistanceBetweenPoints(points: Points[]): number {
    if (points.length === 2) {
        return Number(Math.sqrt(Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)).toFixed(4));
    }
    return 0;
}

// * Compute the pixel size based on the real world coordinates and the pixel coordinates.
// * Return the size of a pixel in the real world units.

function computePixelSize(pixelPoints: Points[], rwPoints: Points[]): { size: number, rw_lenght: number } {
    const pixelDistance = getDistanceBetweenPoints(pixelPoints);
    const rwDistance = getDistanceBetweenPoints(rwPoints);

    const pSize = Number((rwDistance / pixelDistance).toFixed(4))
    const lineLength = Number(rwDistance.toFixed(4))

    return { size: pSize, rw_lenght: lineLength };
}


export { getDistanceBetweenPoints, computePixelSize }