import { IMAGE_WIDTH_FACTOR } from "../constants/constants";

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

