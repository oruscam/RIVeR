
export const getNewImageResolution = (screenWidth: number, screenHeight: number, imageWidth: number, imageHeight: number ) => {

    let scaleFactorX: number;
    let scaleFactorY: number;
    let newImageWidth: number;
    let newImageHeight: number;


    if(imageWidth <= 500){
        scaleFactorX = 1;
        scaleFactorY = 1
    } else if(screenWidth >= 1820 && screenHeight >= 1100){
        if(imageWidth < 1280){
            scaleFactorX = 1;
            scaleFactorY = 1;
        } else {
            console.log("third condition")
            scaleFactorX = imageWidth / 1280;
            scaleFactorY = imageHeight / 720;
    }
    } else if(screenWidth >= 1580 && screenHeight >= 1024){
        console.log("hola")
        scaleFactorX = imageWidth / 1024;
        scaleFactorY = imageHeight / 720;
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

