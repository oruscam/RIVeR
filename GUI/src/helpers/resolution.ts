
// export const ajustResolution = (width: number, height: number) => {
//     const displayWidth = 1280;
//     const displayHeigth = 720;
//     const x_multiplier = width / displayWidth
//     const y_multiplier = height/ displayHeigth

//     return {x_multiplier, y_multiplier}
// }


// const scaleFactor = (1280 * 100 / 1920) / 100
// const newImageWidth = screenWidth * scaleFactor
// const newImageHeight = screenHeight * scaleFactor 

// return {
//     width: newWidth,
//     height: newHeight,
//     factor: scaleFactor
// }


export const getNewImageResolution = (screenWidth: number, imageWidth: number, imageHeight: number ) => {

    let scaleFactorX: number;
    let scaleFactorY: number;
    let newImageWidth: number;
    let newImageHeight: number;

    if(imageWidth <= 500){
        scaleFactorX = 1;
        scaleFactorY = 1
    } else if(screenWidth >= 1820){
        if(imageWidth < 1280){
            scaleFactorX = 1;
            scaleFactorY = 1;
        } else {
            scaleFactorX = imageWidth / 1280;
            scaleFactorY = imageHeight / 720;
    }
    } else if(screenWidth >= 1580){
        scaleFactorX = imageWidth / 1024;
        scaleFactorY = imageHeight / 720;
    } else if(screenWidth >= 1320){
        scaleFactorX = imageWidth / 800;
        scaleFactorY = imageHeight / 520;
    } else {
        scaleFactorX = imageWidth / 600;
        scaleFactorY = imageHeight / 420;
    }

    newImageWidth = imageWidth / scaleFactorX;
    newImageHeight = imageHeight / scaleFactorY;


    return {
        width: newImageWidth,
        height: newImageHeight,
        factor: {
            x: scaleFactorX,
            y: scaleFactorY
        }
    };
}

interface Points {
    x: number;
    y: number;
}
// Calcula la distancia entre 2 puntos y la retorna
export const getDistanceBetweenPoints = ( points: Points[] ) => {
    if (points.length === 2) {
      const xDiff = points[1].x - points[0].x;
      const yDiff = points[1].y - points[0].y;
      const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
      return distance;
    }
    return 0;
  };