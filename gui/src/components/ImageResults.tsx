import { useImageZoomPan, useProjectSlice, useSectionSlice, useUiSlice } from "../hooks";
import { DrawSectionsD3 } from "./CrossSections/DrawSectionsD3";
import { VelocityVector } from "./Graphs";
import { OverlaySvg } from "./OverlaySvg";

export const ImageResults = ({ reportFactor, reportWidth, reportHeight, isReport = false, sectionIndex = 0 }: {reportFactor?: {x: number, y: number}, reportWidth?: number, reportHeight?: number, isReport?: boolean, sectionIndex?: number}) => {
    const { screenSizes } = useUiSlice();
    const {
        imageWidth,
        imageHeight,
        factor
    } = screenSizes;
    const { firstFramePath } = useProjectSlice();

    const { scale, position } = useImageZoomPan({
        containerWidth: imageWidth!,
        containerHeight: imageHeight!,
        minScale: 1,
        maxScale: 1,
        zoomSpeed: 0.001,
        enableKeyboardNav: false,
        keyboardStep: 25,
    })

    return (
        <div 
            className="image-with-data-container"
            style={{
                width: reportWidth ? reportWidth : imageWidth!,
                height: reportHeight ? reportHeight : imageHeight!,
                position: "relative",
                overflow: "hidden",
            }}
            >
            <div
                style={{transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`}}
            >
                <img 
                    src={firstFramePath} 
                    className="simple-image"
                    draggable={false}
                />
            </div>

            {
                isReport === false && (
                    <OverlaySvg width={imageWidth!} height={imageHeight!} scale={scale} position={position}>
                        {(layers) => (
                            <>
                                <DrawSectionsD3
                                    width={imageWidth!}
                                    height={imageHeight!}
                                    factor={factor!}
                                    module={"results"}
                                    scale={scale}
                                    position={position}
                                    layers={layers}
                                />  
                                <VelocityVector 
                                    width={imageWidth!} 
                                    height={imageHeight!}
                                    factor={factor!} 
                                    layers={layers} 
                                    isReport={isReport} />
                            </>
                        )}
                    </OverlaySvg>
                )
            }
            {
                isReport &&
                        <OverlaySvg
                            key={sectionIndex}
                            width={reportWidth!}
                            height={reportHeight!}
                            scale={scale}
                            position={position}
                        >
                            {(layers) => (
                                <>
                                    <DrawSectionsD3
                                        width={reportWidth!}
                                        height={reportWidth!}
                                        factor={reportFactor!}
                                        module="report"
                                        scale={scale}
                                        position={position}
                                        layers={layers}
                                        sectionIndex={sectionIndex}
                                    />
                                    <VelocityVector
                                        width={reportWidth!}
                                        height={reportHeight!}
                                        factor={reportFactor!}
                                        layers={layers}
                                        isReport={isReport}
                                        sectionIndex={sectionIndex}
                                    />
                                </>
                            )}
                        </OverlaySvg>
            }


        </div>
    )
}
