import { Image } from 'react-konva'
import { pinRed, pinGreen, pin }from '../assets/icons/icons'
import useImage from 'use-image'
import { KonvaEventObject } from 'konva/lib/Node';
import { useUiSlice } from '../hooks';
import sortPointsByX from '../helpers/sortPoints';



interface PointsProps {
    localPoints: { x: number; y: number }[];
    setLocalPoints: (points: { x: number; y: number }[]) => void;
    draggable: boolean;
    isPixelSize: boolean;
}

export const Points = ({ localPoints = [], setLocalPoints, draggable, isPixelSize }: PointsProps) => {
    const { onSetPoints } = useUiSlice()
    const [iconRed] = useImage(pinRed) 
    const [iconGreen] = useImage(pinGreen) 
    const [icon] = useImage(pin)



    //  CAMBIA EL ESTILO DEL POINTER CUANDO PASA POR ENCIMA DE UN PUNTO
    const handleCursorEnter = (event: KonvaEventObject<MouseEvent>) => {
        const stage = event.target.getStage();
        if( stage ){
            stage.container().style.cursor = 'move';
        }
    }
    
        //  CAMBIA EL ESTILO DEL POINTER CUANDO PASA POR ENCIMA DE UN PUNTO
    const handleCursorLeave = ( event: KonvaEventObject<MouseEvent>) => {
        const stage = event.target.getStage();
        if( stage ){
            stage.container().style.cursor = 'default';
        }
    }

    const handleDragPoint = (event: any, index: number) => {
        let newPoints = [...localPoints];
        newPoints[index] = { x: event.target.x(), y: event.target.y() };
        newPoints = sortPointsByX(newPoints);
        setLocalPoints(newPoints);
        onSetPoints(newPoints)
      }


    return (
        <>
            {localPoints.map((point, index) => (
                <Image
                    key={index}
                    image={isPixelSize ? icon : (index === 1 ? iconRed : iconGreen)}
                    x={point.x}
                    y={point.y}
                    width={40} 
                    height={40} 
                    offsetX={20}
                    offsetY={39}
                    onMouseEnter={handleCursorEnter}
                    onMouseLeave={handleCursorLeave}
                    draggable={draggable}
                    onDragEnd={(event) => handleDragPoint(event, index)}
                />
            ))}
        </>
    );
}
