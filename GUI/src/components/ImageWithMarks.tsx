import * as React from "react"
import { useEffect } from "react"
import useImage from "use-image"
import { Image, Layer, Line, Stage } from "react-konva"
import { KonvaEventObject } from "konva/lib/Node"
import { pin }from '../assets/icons/icons'
import './components.css'

interface ImageWithMarksProps {
  width: number,
  height: number
  imagePath: string,
  points: { x: number, y: number }[],
  setPoints: React.Dispatch<React.SetStateAction<{ x: number, y: number }[]>>
  drawLine: boolean
}

export const ImageWithMarks = ({width, height, imagePath, points, setPoints, drawLine}: ImageWithMarksProps) => {
    const [image] = useImage(imagePath)
    const [icon] = useImage(pin)
    const [click, setClick] = React.useState(false)

    const getRelativePointerPosition = (node: any) => {
      // the function will return pointer position relative to the passed node
      var transform = node.getAbsoluteTransform().copy();
      // to detect relative position we need to invert transform
      transform.invert();
    
      // get pointer (say mouse or touch) position
      var pos = node.getStage().getPointerPosition();
    
      // now we find relative point
      return transform.point(pos);
    }
    
    const handleImageClick = (event: any) => {
      const stage = event.target.getStage();
      const pointerPosition = getRelativePointerPosition(stage);
      const newPoints = [...points];
      if(newPoints.length < 2){
        newPoints.push({ x: pointerPosition.x, y: pointerPosition.y });
      }
      setPoints(newPoints);
      setClick(true)
    }

    const handleDragPoint = (event: any, index: number) => {
      const newPoints = [...points];
      newPoints[index] = { x: event.target.x(), y: event.target.y() };
      setPoints(newPoints);
    }

    const handleCursor = (event: KonvaEventObject<MouseEvent>) => {
      const stage = event.target.getStage();
      if (stage){
        if(event.type == 'mouseenter'){
          stage.container().style.cursor = 'move';
        }else{
          stage.container().style.cursor = 'default';
        }
      }
    }

  const handleOnWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const stage = event.target.getStage();
    const oldScale = stage?.scaleX();
    const pointer = getRelativePointerPosition(stage);

    console.log(stage?.children)

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
      if(newScale > 1.5){
        stage.draggable(true)
      }else{
        stage.draggable(false)
      }
    }
  
    };
    
    const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
      const stage = event.target.getStage();
      const pointer = getRelativePointerPosition(stage);
      const pointerPosition = { x: pointer.x, y: pointer.y };
  
      if(points.length === 1){
        const newPoints = [...points];
        newPoints.push(pointerPosition);
        setPoints(newPoints);
      } else {
        const newPoints = [...points];
        newPoints.pop()
        newPoints.push(pointerPosition)
        setPoints(newPoints);
      }
    }
  
  useEffect(() => {
    if(drawLine){
      setPoints([{
        x: 80,
        y: 80
      }])
    }else{
      setPoints([])
      setClick(false)
    }
  }, [drawLine])

  return (
    <>
      <Stage 
        width={width} 
        height={height} 
        className="image-with-marks" 
        onClick={drawLine ? handleImageClick : undefined} 
        onWheel={handleOnWheel}
        onMouseMove={!click && drawLine ? handleMouseMove: undefined}
        >
        <Layer>
          <Image image={image} width={width} height={height}></Image>
            {
              points.map((point, index) => (
                <Image 
                  image={icon} 
                  key={index} 
                  width={40} 
                  height={40} 
                  x={point.x} 
                  y={point.y}
                  offsetX={20}
                  offsetY={39}
                  draggable
                  onDragEnd={(event) => handleDragPoint(event, index)}
                  onMouseEnter={handleCursor}
                  onMouseLeave={handleCursor}
                  ></Image>
                ))
            }
            {
              points.length === 2 && drawLine && (
                <Line
                  points={[points[0].x, points[0].y, points[1].x, points[1].y]}
                  stroke="#054A74"
                  strokeWidth={2}
                  lineCap="round"
                />
              )
            }
        </Layer>
      </Stage>
    </>
  )
}



