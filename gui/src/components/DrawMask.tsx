import { useEffect, useRef, useState } from "react";
import * as d3 from 'd3';
import { useDataSlice } from "../hooks";
import { drawMask } from "./Graphs/drawMask";

export const DrawMask = ({ 
    width, 
    height, 
    factor,
    scale = 1,
    offsetX = 0,
    offsetY = 0
}: { 
    width: number; 
    height: number; 
    factor: number;
    scale? :  number;
    offsetX?: number;
    offsetY?: number;
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const { processing, onUpdateMaskPoints } = useDataSlice()
    const { masks, activeMaskIndex } = processing;

    // Active mask points state
    const [points, setPoints] = useState(masks![activeMaskIndex!].map((p, i) => ({ x: p.x, y: p.y, id: i })));

    // Dragging states
    // Dragging point index or null, is used when the user are dragging a single point
    const [dragging, setDragging] = useState<number|null>(null);

    // draggingAll: -> is used when the user is dragging the entire mask
    // dragStart: -> starting point of the drag in viewport coordinates, is used to calculate deltas for position updates
    const [draggingAll, setDraggingAll] = useState(false);
    const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);

    // Ctrl key state. Used to enable/disable mask dragging.
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);

    // Next point ID ref, when you create a mask it is a triangle, so start from 3
    const nextIdRef = useRef(3);

    // Function to transform coordinates from image to viewport
    // Used to position points and polygon correctly according to zoom/pan
    const transformToViewport = (x: number, y: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        
        const scaledX = (x / factor - width / 2) * scale;
        const scaledY = (y / factor - height / 2) * scale;
        
        return {
            x: scaledX + centerX + offsetX,
            y: scaledY + centerY + offsetY
        };
    };

    // Function to transform coordinates from viewport to image
    // Used to get image coordinates when adding/moving points
    const transformToImage = (vx: number, vy: number) => {
        const centerX = width / 2;
        const centerY = height / 2;
        
        const translatedX = vx - centerX - offsetX;
        const translatedY = vy - centerY - offsetY;
        
        const unscaledX = translatedX / scale;
        const unscaledY = translatedY / scale;
        
        return {
            x: (unscaledX + width / 2) * factor,
            y: (unscaledY + height / 2) * factor
        };
    };

    // Global keydown/keyup listeners to track Ctrl key state
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control' || e.ctrlKey) {
                setIsCtrlPressed(true);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control' || ! e.ctrlKey) {
                setIsCtrlPressed(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Draw/update mask on relevant state changes
    useEffect(() => {
        if (!svgRef.current) return;

        const svg = d3.select(svgRef.current);
        drawMask(
            svg,
            svgRef,
            isCtrlPressed,
            addPoint,
            setDragStart,
            setDragging,
            setDraggingAll,
            points,
            transformToViewport,
            transformToImage
        )

    }, [points, factor, scale, offsetX, offsetY, width, height, dragging, draggingAll, isCtrlPressed]);

    // Update points when active mask changes
    useEffect(() => {
        setPoints(masks![activeMaskIndex!].map((p, i) => ({ x: p.x, y: p. y, id: i })));
    }, [activeMaskIndex]);

    // Function to add a new point to the mask at given index and image coordinates
    const addPoint = (index: number, x: number, y: number) => {
        const newPoints = [...points];
        newPoints.splice(index, 0, { x, y, id: nextIdRef.current++ });
        setPoints(newPoints);
    };

    // Handle mouse move events for dragging points or the entire mask
    const handleMouseMove = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        if (draggingAll && dragStart) {
            // Move entire mask
            event.stopPropagation();
            const svg = svgRef.current;
            if (!svg) return;

            const rect = svg.getBoundingClientRect();
            const currentVx = event.clientX - rect.left;
            const currentVy = event.clientY - rect.top;
            
            const deltaVx = currentVx - dragStart.x;
            const deltaVy = currentVy - dragStart.y;
            
            // Convert deltas from viewport to image coordinates
            const startImg = transformToImage(dragStart.x, dragStart.y);
            const endImg = transformToImage(dragStart.x + deltaVx, dragStart.y + deltaVy);
            
            const deltaImgX = endImg.x - startImg.x;
            const deltaImgY = endImg. y - startImg.y;
            
            const newPoints = points.map(p => ({
                ...p,
                x: p. x + deltaImgX,
                y: p.y + deltaImgY
            }));
            
            setPoints(newPoints);
            setDragStart({ x: currentVx, y: currentVy });

        } else if (dragging !== null) {
            // Move only one point of the mask
            event.stopPropagation();
            const svg = svgRef.current;
            if (!svg) return;

            const rect = svg.getBoundingClientRect();
            const vx = event.clientX - rect.left;
            const vy = event. clientY - rect.top;
            
            const imgCoords = transformToImage(vx, vy);
            
            const newPoints = [...points];
            newPoints[dragging] = { ... newPoints[dragging], x:  imgCoords.x, y: imgCoords.y };
            setPoints(newPoints);
        }
    };

    // Handle mouse up events to stop dragging and save changes
    const handleMouseUp = (event: React. MouseEvent<SVGSVGElement, MouseEvent>) => {
        if (dragging !== null || draggingAll) {
            event.stopPropagation();
            // Save updated points to the data slice. Redux-state
            onUpdateMaskPoints(activeMaskIndex!, points);
        }
        setDragging(null);
        setDraggingAll(false);
        setDragStart(null);
    };

    // Prevent zoom/pan when clicking on mask elements
    const handleMouseDown = (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        const target = event.target as HTMLElement;
        const targetName = target.tagName.toUpperCase()
        if (targetName === 'CIRCLE' || targetName === 'RECT' || targetName === 'POLYGON') {
            event.stopPropagation();
        }
    };

    return (
        <svg
            ref={svgRef}
            width={width}
            height={height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="draw-mask"
        />
    );
}