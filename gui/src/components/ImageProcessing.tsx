import { useMemo, useRef } from "react";
import { useDataSlice, useImageZoomPan, useProjectSlice, useSectionSlice, useUiSlice } from "../hooks";
import { ColorBar } from "./ColorBar";
import { WindowSizesNew } from "./WindowSizesNew";
import { Quiver } from "./Quiver";
import { DrawSectionsD3 } from "./CrossSections/DrawSectionsD3";
import { OverlaySvg } from "./OverlaySvg";
import { QuiverData } from "../../commons/types";
import { getQuiverValues, createColorMap, Normalize } from '../../commons/vectors';
import { ExportMp4 } from "./Forms/Components";
import { FloatingPlot } from './FloatingPlot';

export const ImageProcessing = ({ showMedian, extraFields }: { showMedian?: boolean; extraFields?: boolean }) => {
    const { screenSizes } = useUiSlice();
    const { video } = useProjectSlice();
    const { processing, images, quiver, colorbarLimits } = useDataSlice();
    const { transformationMatrix } = useSectionSlice();
    const {
        imageWidth: width,
        imageHeight: height,
        factor,
        heightReduced,
        widthReduced,
        factorReduced,
        vertical,
    } = screenSizes;
    const { parameters, data: videoData } = video;
    const { paths, active } = images;

    const { activeMaskIndex } = processing;

    const containerRef = useRef<HTMLDivElement>(null);

    if (!width || !height || !factor) return null;

    type PrevRefType = {
        activeImage: typeof images.active;
        data: QuiverData[];
        min: number;
        max: number;
    };

    const prevRef = useRef<PrevRefType>({ activeImage: images.active, data: [], min: 0, max: 0 });

    const realWidth = vertical ? widthReduced : width;
    const realHeight = vertical ? heightReduced : height;
    const realFactor = vertical ? factorReduced : factor;

    const { data, min, max } = useMemo(() => {

        if (quiver === null) {
            prevRef.current = { activeImage: images.active, data: [], min: 0, max: 0 };
            return { data: [], min: 0, max: 0 };
        }
        if (prevRef.current.activeImage !== images.active && quiver.test) {
            prevRef.current.activeImage = images.active;
            return { data: [], min: 0, max: 0 };
        }

        const { data, min, max } = getQuiverValues(quiver, showMedian as boolean, images.active, parameters.step, videoData.fps, transformationMatrix);
        prevRef.current = { activeImage: images.active, data, min, max };
        // If the user has set custom colorbar limits, apply them
        if (colorbarLimits.default === false) {
            const manualMin = colorbarLimits.min!;
            const manualMax = colorbarLimits.max!;
            const norm = new Normalize(manualMin, manualMax);
            const colorMap = createColorMap();
            const recoloredData = data.map((d) => {
                const clamped = Math.max(manualMin, Math.min(manualMax, d.velocity));
                const normalizedValue = norm.normalize(clamped);
                const colorIndex = Math.max(0, Math.min(Math.floor(normalizedValue * (colorMap.length - 1)), colorMap.length - 1));
                return { ...d, color: colorMap[colorIndex] };
            });
            return { data: recoloredData, min: manualMin, max: manualMax };
        }
        return { data, min, max };

    }, [quiver, images.active, showMedian, colorbarLimits.default, colorbarLimits.min, colorbarLimits.max]);

    const { isDragging, scale, position } = useImageZoomPan({
        containerWidth: realWidth!,
        containerHeight: realHeight!,
        minScale: 1,
        maxScale: 1,
        zoomSpeed: 0.001,
        enableKeyboardNav: false,
        keyboardStep: 25,
    })

    return (
        <div
            ref={containerRef}
            className="image-with-data-container"
            style={{
                width: realWidth,
                height: realHeight,
                cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default',
            }}
        >
            <div
                style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}
            >
                <img
                    src={paths[active]}
                    className="simple-image"
                    draggable={false}
                />
                <img
                    src={processing.maskPath}
                    className="mask"
                    draggable={false}
                />
            </div>
            <div style={{ position: 'absolute', top: '15px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <ExportMp4 />
            </div>

            {
                data.length === 0 && activeMaskIndex === null && (
                    <WindowSizesNew width={realWidth!} height={realHeight!} />
                )
            }

            {
                activeMaskIndex === null && (
                    <OverlaySvg width={realWidth!} height={realHeight!} scale={scale} position={position}>
                        {(layers) => (
                            <>
                                <DrawSectionsD3
                                    width={realWidth!}
                                    height={realHeight!}
                                    factor={realFactor!}
                                    module="processing"
                                    scale={scale}
                                    position={position}
                                    layers={layers}
                                />
                                <Quiver width={realWidth!} height={realHeight!} factor={realFactor!} data={data} showMedian={showMedian} layers={layers} />
                            </>
                        )}
                    </OverlaySvg>
                )
            }

            {/* ColorBar out of the container with zoom */}
            {min !== undefined && max !== undefined && activeMaskIndex === null && (
                <ColorBar min={min} max={max} />
            )}

            {extraFields && activeMaskIndex === null && (
                <FloatingPlot
                    showMedian={showMedian ?? false}
                    containerWidth={realWidth!}
                    containerHeight={realHeight!}
                />
            )}
        </div>
    )
}