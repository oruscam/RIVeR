import { useEffect, useState } from 'react'
import useImage from 'use-image'
import { Group, Image, Layer, Line, Stage } from 'react-konva'
import { KonvaEventObject } from 'konva/lib/Node'
import { useUiSlice } from '../hooks'
import { Points, LineAndText } from './index'
import sortPointsByX from '../helpers/sortPoints'

type Point = { x: number; y: number };

// ! PROVISIONAL
interface ImageWithMarksProps {
  imagenPath: string;
  width: number;
  height: number;
  factor: number;
}

export const ImageWithMarks2 = ({imagenPath, width, height, factor}: ImageWithMarksProps) => {
  const { sections, activeSection, onSetPoints, seeAll} = useUiSlice()
  const {drawLine, points, name} = sections[activeSection]

  const [localPoints, setLocalPoints] = useState<Point[]>([])
  const [mousePressed, setMousePressed] = useState(false)
  const [currentMousePosition, setCurrentMousePosition] = useState<Point>({ x: 0, y: 0 })

  const [image] = useImage(imagenPath)

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
      onSetPoints(newPoints);
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
        setLocalPoints(points);
      }else {
        setLocalPoints([])
      }
      if(!drawLine){
        onSetPoints([])
        setLocalPoints([])
      }

    }, [activeSection, drawLine])
    

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
            !seeAll ? (
              <Group>
                <Points localPoints={localPoints} setLocalPoints={setLocalPoints} draggable={true} isPixelSize={activeSection === 0}></Points>
                {
                  localPoints.length === 2 && drawLine && (
                    <LineAndText name={name} imagePoints={localPoints} isPixelSize={ activeSection === 0}></LineAndText>
                  )
                }
              </Group>
            ) : sections.map((section, index) => {
              if( section.points.length === 0 ) return null
              return (
                <Group key={index}>
                  <Points localPoints={section.points} setLocalPoints={setLocalPoints} draggable={index === activeSection} isPixelSize={false}></Points>
                  <LineAndText name={section.name} imagePoints={section.points} isPixelSize={false}></LineAndText>
                </Group>
              )
            })
          }
          {mousePressed && localPoints.length === 1 && (
              <Line
                points={[localPoints[0].x, localPoints[0].y, currentMousePosition.x, currentMousePosition.y]}
                stroke={activeSection === 0 ? "#054A74" : "#F5BF61"}
                strokeWidth={2}
                lineCap="round"
              />
            )}
        </Layer>
      </Stage>
    </>
  )
}


