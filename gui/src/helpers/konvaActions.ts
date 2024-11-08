import { KonvaEventObject } from "konva/lib/Node";
import { Point } from "../types";

export const getRelativePointerPosition = (node: any) => {
    const transform = node.getAbsoluteTransform().copy();
    transform.invert();
    const pos = node.getStage().getPointerPosition();
    return transform.point(pos);
}

export const imageZoom = ( event: KonvaEventObject<WheelEvent>, setResizeFactor: (factor: number) => void, isDraggable: boolean ) => {
    event.evt.preventDefault();
    const stage = event.target.getStage();
    const oldScale = stage?.scaleX();
    const pointer = getRelativePointerPosition(stage);

    if ( stage && oldScale && pointer ) {
        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
          };
  
        const scaleBy = 1.05;
        const direction = event.evt.deltaY > 0 ? -1 : 1;

        let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

        if (newScale > 70) {
            newScale = 70;
        }

        if (newScale >= 1.01) {
            stage.scale({ x: newScale, y: newScale });

            const newPos = direction > 0 || newScale > 1.25
                ? {
                    x: pointer.x - mousePointTo.x * newScale,
                    y: pointer.y - mousePointTo.y * newScale,
                }
                : {
                    x: (stage.width() / 2) - (stage.width() / 2 * newScale),
                    y: (stage.height() / 2) - (stage.height() / 2 * newScale),
                };

            stage.position(newPos);
        }

        if ( newScale > 1.5 && isDraggable ){
            stage.draggable(true)

            if ( newScale <  3){
                setResizeFactor(1.5)
              } else if ( newScale < 8){
                setResizeFactor(3)
              } else if ( newScale < 15){
                setResizeFactor(4)
              } else if ( newScale < 22){
                setResizeFactor(5)
              }else if ( newScale < 29){
                setResizeFactor(6)
              } else if ( newScale < 36){
                setResizeFactor(7)
              } else if ( newScale < 43){
                setResizeFactor(9)
              } else if ( newScale < 50){
                setResizeFactor(10)
              } else if ( newScale < 60 ){
                setResizeFactor(11)
              } else if ( newScale < 70 ){
                setResizeFactor(12)
              }

        } else {
            stage.draggable(false)
            setResizeFactor(1)
        }
    }
}

export const onMouseDownPixelSize = ( event: KonvaEventObject<MouseEvent>, setLocalPoints: (points: Point[]) => void, setCurrentMousePosition: (position: Point) => void, setMousePressed: (pressed: boolean) => void) => {
    const stage = event.target.getStage();
    const pointerPosition = getRelativePointerPosition(stage);
    
    setLocalPoints([pointerPosition]);
    setCurrentMousePosition(pointerPosition);
    setMousePressed(true);
}

export const onMouseUpPixelSize = ( event: KonvaEventObject<MouseEvent>, localPoints: Point[], setLocalPoints: (points: Point[]) => void, setMousePressed: (pressed: boolean) => void) => {
    
    const stage = event.target.getStage();
    const pointerPosition = getRelativePointerPosition(stage);
    const newPoints = [...localPoints]
    newPoints.push(pointerPosition)

    setLocalPoints(newPoints);
    setMousePressed(false);

    return newPoints;

}