
export const getNewImageResolution = (screenWidth: number, screenHeight: number, imageWidth: number, imageHeight: number ) => {

    let scaleFactorX: number;
    let scaleFactorY: number;
    let newImageWidth: number;
    let newImageHeight: number;

    if(imageWidth <= 500){
        scaleFactorX = 1;
        scaleFactorY = 1
    } else if(screenWidth >= 1820 && screenHeight >= 1010){
        if(imageWidth < 1280){
            scaleFactorX = 1;
            scaleFactorY = 1;
        } else {
            scaleFactorX = imageWidth / 1280;
            scaleFactorY = imageHeight / 720;
        } 
    } else if ( screenWidth >= 1820 && screenHeight >= 1000){
        scaleFactorX = (imageWidth / 1260);
        scaleFactorY = (imageHeight / 700);
    } 
    else if(screenWidth >= 1580 && screenHeight >= 980){
        scaleFactorX = imageWidth / 1120;
        scaleFactorY = imageHeight / 700;
    } else if(screenWidth >= 1320 && screenHeight >= 900){
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

