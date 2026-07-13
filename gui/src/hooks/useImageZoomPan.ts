import { useCallback, useEffect, useRef, useState } from "react"

interface UseImageZoomPanProps {
    containerWidth: number;
    containerHeight: number;
    minScale: number;
    maxScale: number;
    zoomSpeed: number;
    enableKeyboardNav?: boolean;
    keyboardStep?: number;
}

export const useImageZoomPan = ({ containerWidth, containerHeight, minScale, maxScale, zoomSpeed, enableKeyboardNav = false, keyboardStep = 25 }: UseImageZoomPanProps) => {

    
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const maskDraggingRef = useRef(false);

    // Function to apply limits to position based on scale
    const applyPositionLimits = useCallback((x: number, y: number, currentScale: number) => {
        if (currentScale <= minScale) {
            return { x:  0, y: 0 };
        }
        
        const maxX = (containerWidth * (currentScale - 1)) / 2;
        const maxY = (containerHeight * (currentScale - 1)) / 2;
        
        return {
            x: Math.min(Math.max(x, -maxX), maxX),
            y: Math.min(Math. max(y, -maxY), maxY),
        };
    }, [containerWidth, containerHeight, minScale]);

    // Handle zooming with mouse wheel, keeping the point under the cursor fixed
    const handleWheel = useCallback((e: React.WheelEvent) => {
        // e.preventDefault();
        e.stopPropagation();

        const delta = e.deltaY * -zoomSpeed;
        const newScale = Math.min(Math. max(minScale, scale + delta), maxScale);

        if (newScale === scale) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - containerWidth / 2;
        const mouseY = e.clientY - rect.top - containerHeight / 2;
        const scaleRatio = newScale / scale;

        const newX = mouseX - scaleRatio * (mouseX - position.x);
        const newY = mouseY - scaleRatio * (mouseY - position.y);

        setScale(newScale);

        const limitedPosition = applyPositionLimits(newX, newY, newScale);
        setPosition(limitedPosition);
    }, [scale, position, applyPositionLimits, minScale, maxScale, zoomSpeed, containerWidth, containerHeight]);

    // Verificar si el click es en un elemento interactivo de la máscara
    const isClickOnMaskPoint = useCallback((target: HTMLElement) => {
        return target.tagName === 'circle' || target.tagName === 'CIRCLE';
    }, []);

    // Manejar inicio del arrastre
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        
        if (isClickOnMaskPoint(target)) {
            maskDraggingRef.current = true;
            return;
        }
        
        if (scale > minScale) {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
            setDragStart({ x: e. clientX - position.x, y: e.clientY - position.y });
        }
    }, [scale, position, minScale, isClickOnMaskPoint]);

    // Manejar movimiento del arrastre
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (maskDraggingRef.current) {
            return;
        }
        
        if (isDragging && scale > minScale) {
            e.preventDefault();
            e.stopPropagation();
            const newX = e.clientX - dragStart.x;
            const newY = e.clientY - dragStart.y;
            
            const limitedPosition = applyPositionLimits(newX, newY, scale);
            setPosition(limitedPosition);
        }
    }, [isDragging, dragStart, scale, applyPositionLimits, minScale]);

    // Manejar fin del arrastre
    const handleMouseUp = useCallback((e:  React.MouseEvent) => {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
        }
        setIsDragging(false);
        maskDraggingRef.current = false;
    }, [isDragging]);

    // Reset zoom
    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (isClickOnMaskPoint(target)) {
            return;
        }
        
        e.preventDefault();
        e.stopPropagation();
        setScale(minScale);
        setPosition({ x: 0, y: 0 });
    }, [minScale, isClickOnMaskPoint]);

    // Prevenir comportamiento de arrastre por defecto
    const handleDragStart = useCallback((e:  React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, []);

    // Reset programático
    const reset = useCallback(() => {
        setScale(minScale);
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
        maskDraggingRef.current = false;
    }, [minScale]);

    // Establecer zoom programáticamente
    const setZoom = useCallback((newScale: number) => {
        const clampedScale = Math.min(Math.max(minScale, newScale), maxScale);
        setScale(clampedScale);
        const limitedPosition = applyPositionLimits(position.x, position.y, clampedScale);
        setPosition(limitedPosition);
    }, [minScale, maxScale, position, applyPositionLimits]);

    useEffect(() => {
        if (!enableKeyboardNav) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (scale <= minScale) return;
            
            let newX = position.x;
            let newY = position.y;

            switch (e.key) {
                case 'ArrowLeft':
                    e. preventDefault();
                    newX = position.x + keyboardStep;
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    newX = position.x - keyboardStep;
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    newY = position. y + keyboardStep;
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    newY = position.y - keyboardStep;
                    break;
                default:
                    return;
            }

            const limitedPosition = applyPositionLimits(newX, newY, scale);
            setPosition(limitedPosition);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [scale, position, applyPositionLimits, minScale, enableKeyboardNav, keyboardStep]);


    return {
        // State
        scale,
        position,
        isDragging,

        // Event Handlers
        handleWheel,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleDoubleClick,
        handleDragStart,

        // Utilities
        reset,
        setZoom,
        applyPositionLimits,
    }
}