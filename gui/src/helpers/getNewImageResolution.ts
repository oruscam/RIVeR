import { IMAGE_WIDTH_FACTOR } from "../constants/constants";

export const getNewImageResolution = (screenWidth: number, _screenHeight: number, imageWidth: number, imageHeight: number ) => {

    const aspectRatio = imageWidth / imageHeight;
    const newImageWidth = screenWidth * IMAGE_WIDTH_FACTOR
    const newImageHeight = newImageWidth / aspectRatio;
    
    if ( newImageWidth >= imageWidth || newImageHeight >= imageHeight ) {
        return {
            width: imageWidth,
            height: imageHeight,
            factor: {
                x: 1,
                y: 1
            }
        };
    } else {
        const scaleFactorX = imageWidth / newImageWidth;
        const scaleFactorY = imageHeight / newImageHeight;

        return {
            width: newImageWidth,
            height: newImageHeight,
            factor: {
                x: scaleFactorX,
                y: scaleFactorY
            }
        };
    }
}

