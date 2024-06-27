import { useEffect, useState } from 'react'
import useImage from 'use-image'
import { Group, Image, Layer, Line, Stage } from 'react-konva'
import { KonvaEventObject } from 'konva/lib/Node'
import { useDataSlice, useUiSlice } from '../hooks'
import { Points, LineAndText } from './index'
import sortPointsByX from '../helpers/sortPoints'

type Point = { x: number; y: number };

// ! PROVISIONAL
interface ImageWithMarksProps {
  width: number;
  height: number;
  factor: { x: number; y: number };

}

export const ImageWithMarks = ({ width, height, factor}: ImageWithMarksProps) => {
  const { seeAll } = useUiSlice()
  const { onSetPoints, sections, activeSection, video } = useDataSlice()
  const {drawLine, points, name} = sections[activeSection]

  const [localPoints, setLocalPoints] = useState<Point[]>([])
  const [mousePressed, setMousePressed] = useState(false)
  const [currentMousePosition, setCurrentMousePosition] = useState<Point>({ x: 0, y: 0 })

  const { firstFramePath } = video.parameters 
  const [image] = useImage(firstFramePath)

  // * Funcion para obtener la posicion del mouse en el canvas, en relacion a la imagen y al Zoom.
  const getRelativePointerPosition = (node: any) => {
    var transform = node.getAbsoluteTransform().copy();
    transform.invert();
    var pos = node.getStage().getPointerPosition();
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

        const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

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
        }else{
          stage.draggable(false)
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
      let newPoints = [...localPoints]
      newPoints.push(pointerPosition)
      newPoints = sortPointsByX(newPoints);

      setLocalPoints(newPoints);
      onSetPoints(newPoints, factor.x, factor.y);
      setMousePressed(false);
    }

    const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
      const stage = event.target.getStage();
      const pointerPosition = getRelativePointerPosition(stage);
      setCurrentMousePosition(pointerPosition);

    }

    // * Trae los puntos del store y los pone en el estado local.

    useEffect(() => {
      if(points.length !== 0){
        let newPoints = points.map(point => {
          return {
            x: point.x / factor.x,
            y: point.y / factor.y
          }
        })
        setLocalPoints(newPoints);
      }else {
        setLocalPoints([])
      }
      if(!drawLine){
        onSetPoints([], factor.x, factor.y)
        setLocalPoints([])
      }
    }, [activeSection, drawLine, factor.x, factor.y])



  // * Limpiar un poco el return, pero la funcionalidad esta lista.  
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
            !seeAll || activeSection === 0 ? (
              <Group>
                <Points localPoints={localPoints} setLocalPoints={setLocalPoints} draggable={true} isPixelSize={activeSection === 0} factor={factor}></Points>
                {
                  localPoints.length === 2 && drawLine && (
                    <LineAndText name={name} imagePoints={localPoints} isPixelSize={activeSection === 0}></LineAndText>
                  )
                }
              </Group>
            ) : sections.map((section, index) => {
              if( section.points.length === 0 || section.name === 'pixel_size') return null

              const reducedPoints = section.points.map(point => {
                return {
                  x: point.x / factor.x,
                  y: point.y / factor.y
                }
              })

              return (
                <Group key={index}>
                  <Points localPoints={reducedPoints} setLocalPoints={setLocalPoints} draggable={index === activeSection} isPixelSize={false} factor={factor}></Points>
                  <LineAndText name={section.name} imagePoints={reducedPoints} isPixelSize={false}></LineAndText>
                </Group>
              )
            })
          }
          {mousePressed && localPoints.length === 1 && (
              <Line
                points={[localPoints[0].x, localPoints[0].y, currentMousePosition.x, currentMousePosition.y]}
                stroke={activeSection === 0 ? "#6CD4FF" : "#F5BF61"}
                strokeWidth={2}
                lineCap="round"
              />
            )}
        </Layer>
      </Stage>
    </>
  )
}


