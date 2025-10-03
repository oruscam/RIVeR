import { IMAGE_HEIGHT_FACTOR, IMAGE_HEIGHT_REDUCED_FACTOR, IMAGE_WIDTH_FACTOR } from '../constants/constants';

// This function is used to calculate the new image resolution based on the screen width
// and the image resolution. It returns the new image resolution and the factor that was
// used to calculate it.

export const getNewImageResolution = (
  screenWidth: number,
  screenHeight: number,
  imageWidth: number,
  imageHeight: number
) => {
  const aspectRatio = imageWidth / imageHeight;

  let factor = 1;

  let newImageWidth = 0;
  let newImageHeight = 0;

  let imageHeightReduced = 0;
  let imageWidthReduced = 0;
  let factorReduced = 1;

  let vertical = false;

  // 16:9
  if (aspectRatio >= 1.5) {
    newImageWidth = screenWidth * IMAGE_WIDTH_FACTOR;
    newImageHeight = newImageWidth / aspectRatio;
    factor = imageWidth / newImageWidth;
  }
  // 4:3
  else if (aspectRatio < 1.5 && aspectRatio >= 1) {
    newImageWidth = screenWidth * 0.52;
    newImageHeight = newImageWidth / aspectRatio;
    factor = imageWidth / newImageWidth;
  }
  //
  else if (aspectRatio < 1 && aspectRatio >= 0.5) {
    newImageHeight = screenHeight * IMAGE_HEIGHT_FACTOR;
    newImageWidth = newImageHeight * aspectRatio;
    factor = imageHeight / newImageHeight;

    imageHeightReduced = screenHeight * IMAGE_HEIGHT_REDUCED_FACTOR;
    imageWidthReduced = imageHeightReduced * aspectRatio;
    factorReduced = imageHeight / imageHeightReduced;

    if (imageHeight > imageWidth) {
      vertical = true;
    }
  }

  if (newImageWidth >= imageWidth || newImageHeight >= imageHeight) {
    return {
      width: imageWidth,
      height: imageHeight,
      factor: 1,

      heightReduced: imageHeightReduced,
      widthReduced: imageWidthReduced,
      factorReduced: factorReduced,
      vertical: vertical,
    };
  } else {
    return {
      width: newImageWidth,
      height: newImageHeight,
      factor: factor,

      heightReduced: imageHeightReduced,
      widthReduced: imageWidthReduced,
      factorReduced: factorReduced,

      vertical: vertical,
    };
  }
};
