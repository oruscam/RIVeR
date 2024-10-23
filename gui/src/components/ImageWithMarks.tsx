import { useEffect, useState } from 'react'
import useImage from 'use-image'
import { Group, Image, Layer, Line, Stage } from 'react-konva'
import { KonvaEventObject } from 'konva/lib/Node'
import { useSectionSlice, useProjectSlice, useUiSlice } from '../hooks'
import { Points, DrawSections } from './index'

type Point = { x: number; y: number };

// ! PROVISIONAL
interface ImageWithMarksProps {
  width: number;
  height: number;
  factor: number;
}

export const ImageWithMarks = ({ width, height, factor}: ImageWithMarksProps) => {
  const { seeAll } = useUiSlice()
  const { onSetDirPoints, sections, activeSection} = useSectionSlice()
  const { firstFramePath } = useProjectSlice(); 
  const { drawLine, dirPoints } = sections[activeSection]


  const [localPoints, setLocalPoints] = useState<Point[]>([])
  const [mousePressed, setMousePressed] = useState(false)
  const [currentMousePosition, setCurrentMousePosition] = useState<Point>({ x: 0, y: 0 })

  const [image] = useImage('/@fs' + firstFramePath)

  const [resizeFactor, setResizeFactor] = useState(1)

  // * Funcion para obtener la posicion del mouse en el canvas, en relacion a la imagen y al Zoom.
  const getRelativePointerPosition = (node: any) => {
    const transform = node.getAbsoluteTransform().copy();
    transform.invert();
    const pos = node.getStage().getPointerPosition();
    return transform.point(pos);
  }
  
  // * Zoom
  const handleOnWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const stage = event.target.getStage();
    const oldScale = stage?.scaleX();
    const pointer = getRelativePointerPosition(stage);


    if (stage && oldScale && pointer) {
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
        if(newScale > 1.5 && localPoints.length === 2){
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
          
        }else{
          stage.draggable(false)
          setResizeFactor(1)
        }
      }
    };

    // * Funciones para dibujar lineas

    const handleMouseDown = (event: KonvaEventObject<MouseEvent>) => {
      if ( localPoints.length === 2 || drawLine === false) return;

      const stage = event.target.getStage();
      const pointerPosition = getRelativePointerPosition(stage);
      setLocalPoints([pointerPosition]);
      setCurrentMousePosition(pointerPosition);
      setMousePressed(true);
    }

    const handleMouseUp = (event: KonvaEventObject<MouseEvent> ) => {
      if (!mousePressed) return;
      const stage = event.target.getStage();
      const pointerPosition = getRelativePointerPosition(stage);
      const newPoints = [...localPoints]
      newPoints.push(pointerPosition)

      setLocalPoints(newPoints);
      onSetDirPoints({points: newPoints, factor, index: null}, null);
      setMousePressed(false);
    }

    const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
      const stage = event.target.getStage();
      const pointerPosition = getRelativePointerPosition(stage);
      setCurrentMousePosition(pointerPosition);

    }

    // * Trae los puntos del store y los pone en el estado local.

    useEffect(() => {
      if(dirPoints.length !== 0){
        const newPoints = dirPoints.map(point => {
          return {
            x: point.x / factor,
            y: point.y / factor
          }
        })
        setLocalPoints(newPoints);
      }else {
        setLocalPoints([])
      }

    }, [activeSection, dirPoints, factor, factor])


  return (
    <>
      <Stage 
        width={width} 
        height={height} 
        className="image-with-marks" 
        onWheel={handleOnWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={drawLine && mousePressed && localPoints.length < 2 ? handleMouseMove: undefined}
        >
        <Layer>
          <Image image={image} width={width} height={height}></Image>
          {
            seeAll || activeSection === 0 ? (<DrawSections localPoints={localPoints} setLocalPoints={setLocalPoints} factor={factor} draggable={true} resizeFactor={resizeFactor}/>) : (<DrawSections factor={factor} setLocalPoints={setLocalPoints} draggable={true} resizeFactor={resizeFactor}></DrawSections>)
          }
          {mousePressed && localPoints.length === 1 && (
              <Group>
                <Line
                  points={[localPoints[0].x, localPoints[0].y, currentMousePosition.x, currentMousePosition.y]}
                  stroke={activeSection === 0 ? "#6CD4FF" : "#F5BF61"}
                  strokeWidth={2.8}
                  lineCap="round"
                />
                <Points setLocalPoints={setLocalPoints} localPoints={localPoints} isPixelSize={activeSection === 0} resizeFactor={resizeFactor}></Points>
              </Group>
            )}
        </Layer>
      </Stage>
    </>
  )
}


