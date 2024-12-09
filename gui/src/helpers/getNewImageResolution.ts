import { IMAGE_WIDTH_FACTOR } from "../constants/constants";


// This function is used to calculate the new image resolution based on the screen width
// and the image resolution. It returns the new image resolution and the factor that was
// used to calculate it.

export const getNewImageResolution = (screenWidth: number, _screenHeight: number, imageWidth: number, imageHeight: number ) => {

    const aspectRatio = imageWidth / imageHeight;
    const newImageWidth = screenWidth * IMAGE_WIDTH_FACTOR
    const newImageHeight = newImageWidth / aspectRatio;
    
    if ( newImageWidth >= imageWidth || newImageHeight >= imageHeight ) {
        return {
            width: imageWidth,
            height: imageHeight,
            factor: 1
        };
    } else {
        const factor = imageWidth / newImageWidth;

        return {
            width: newImageWidth,
            height: newImageHeight,
            factor
        };
    }
}