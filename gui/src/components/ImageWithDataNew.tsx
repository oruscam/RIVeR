import { useMemo, useRef } from "react";
import { useDataSlice, useImageZoomPan, useProjectSlice, useSectionSlice, useUiSlice } from "../hooks";
import { getQuiverValues, QuiverData } from "../helpers/drawVectorsFunctions";
import { ColorBar } from "./ColorBar";
import { DrawMask } from "./DrawMask";
import { WindowSizesNew } from "./WindowSizesNew";
import { Quiver } from "./Quiver";
import { DrawSectionsD3 } from "./CrossSections/DrawSectionsD3";
import { MODULE_NUMBER } from "../constants/constants";

export const ImageWithDataNew = ({ showMedian } :  { showMedian?:  boolean }) => {
    const { screenSizes } = useUiSlice();
    const { video } = useProjectSlice();
    const { processing, images, quiver } = useDataSlice();
    const { transformationMatrix } = useSectionSlice();
    const {
        imageWidth:  width,
        imageHeight: height,
        factor,
        heightReduced,
        widthReduced,
        factorReduced,
        vertical,
    } = screenSizes;
    const { parameters, data:  videoData } = video;
    const { paths, active } = images;

    const { masks, activeMaskIndex } = processing;

    const containerRef = useRef<HTMLDivElement>(null);
    
    if (! width || !height || !factor) return null;

    type PrevRefType = {
        activeImage: typeof images.active;
        data: QuiverData[];
        min: number;
        max: number;
    };
    
    const prevRef = useRef<PrevRefType>({activeImage: images.active, data: [], min: 0, max:  0});

    const realWidth = vertical ? widthReduced : width;
    const realHeight = vertical ? heightReduced : height;
    const realFactor = vertical ?  factorReduced : factor;

    const { data, min, max } = useMemo(() => {
        if ( quiver === null ){
            prevRef.current = {activeImage: images.active, data: [], min: 0, max:  0};
            return { data: [], min: 0, max: 0 };
        }

        if (prevRef.current.activeImage !== images.active && quiver.test === true) {
            prevRef. current. activeImage = images.active;
            return { data: [], min: 0, max: 0 };
        }

        const { data, min, max } = getQuiverValues(quiver, showMedian as boolean, images. active, parameters. step, videoData. fps, transformationMatrix);
        prevRef.current = {activeImage: images.active, data, min, max};
        return { data, min, max };
    }, [quiver, images.active, showMedian]);

    const { isDragging, scale, position, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleDoubleClick, handleDragStart } = useImageZoomPan({
        containerWidth: realWidth!,
        containerHeight: realHeight!,
        minScale: 1,
        maxScale: 8,
        zoomSpeed: 0.001,
        enableKeyboardNav: true,
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
            onWheel={activeMaskIndex !== null ? handleWheel : handleWheel}
            onMouseDown={activeMaskIndex !== null ? handleMouseDown : undefined}
            onMouseMove={activeMaskIndex !== null ? handleMouseMove : undefined}
            onMouseUp={activeMaskIndex !== null ? handleMouseUp : undefined}
            onMouseLeave={activeMaskIndex !== null ? handleMouseUp : undefined}
            onDoubleClick={activeMaskIndex !== null ? handleDoubleClick : undefined}
            onDragStart={activeMaskIndex !== null ? handleDragStart : undefined}
        >
            <div
                style={{transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`}}
            >
                <img 
                    src={paths[active]} 
                    className="simple-image"
                    draggable={false}
                    onDragStart={handleDragStart}
                />
                <img 
                    src={processing. maskPath} 
                    className="mask"
                    draggable={false}
                    onDragStart={handleDragStart}
                />
            </div>
            {
                data.length === 0 && activeMaskIndex === null && (
                    <WindowSizesNew width={realWidth!} height={realHeight!}/> 
                )
            }
            {
                masks?.length !== 0 && activeMaskIndex !== null && (
                    <DrawMask 
                        width={realWidth!} 
                        height={realHeight!} 
                        factor={realFactor!}
                        scale={scale}
                        offsetX={position.x}
                        offsetY={position.y}
                    />)
                
            }
            {
                activeMaskIndex === null && (
                    <>
                        <Quiver width={realWidth!} height={realHeight!} factor={realFactor!} data={data} showMedian={showMedian} />
                        <DrawSectionsD3 width={realWidth!} height={realHeight!} factor={realFactor!} step={MODULE_NUMBER.PROCESSING} scale={scale} position={position}/>
                    </>
                )
            }
                
            {/* ColorBar out of the container with zoom */}
            {min !== undefined && max !== undefined && activeMaskIndex === null &&  (
                <ColorBar min={min} max={max} />
            )}
        </div>
    )
}