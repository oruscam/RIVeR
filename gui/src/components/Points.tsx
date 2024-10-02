import { Group, Image, Text } from 'react-konva'
import { pinRed, pinGreen, pin }from '../assets/icons/icons'
import useImage from 'use-image'
import { KonvaEventObject } from 'konva/lib/Node';
import { useSectionSlice } from '../hooks';
import { MARKS_NUMBER_OFFSET_X, MARKS_NUMBER_OFFSET_Y, MARKS_OFFSET_X, MARKS_OFFSET_Y, MARKS_WIDTH, PIXEL_SIZE_STEP_NUMBER } from '../constants/constants';
import { useWizard } from 'react-use-wizard';



interface PointsProps {
    localPoints: { x: number; y: number }[];
    setLocalPoints?: (points: { x: number; y: number }[]) => void;
    draggable?: boolean;
    isPixelSize?: boolean;
    factor?: {
        x: number;
        y: number;
    };
    resizeFactor?: number;
}

export const Points = ({ localPoints = [], setLocalPoints, draggable = false, isPixelSize = false, factor = {x: 0, y: 0}, resizeFactor = 1 }: PointsProps) => {
    const { onSetPoints } = useSectionSlice()
    const [iconRed] = useImage(pinRed) 
    const [iconGreen] = useImage(pinGreen) 
    const [icon] = useImage(pin)

    const { activeStep } = useWizard();


    //  CAMBIA EL ESTILO DEL POINTER CUANDO PASA POR ENCIMA DE UN PUNTO
    const handleCursorEnter = ( event: KonvaEventObject<MouseEvent> ) => {
        const stage = event.target.getStage();
        if( stage && draggable ){
            stage.container().style.cursor = 'move';
        }
    }
    
    //  CAMBIA EL ESTILO DEL POINTER CUANDO PASA POR ENCIMA DE UN PUNTO
    const handleCursorLeave = ( event: KonvaEventObject<MouseEvent> ) => {
        const stage = event.target.getStage();
        if( stage ){
            stage.container().style.cursor = 'default';
        }
    }

    // const handleDragPoint = (event: any, index: number) => {
    //     if( draggable === false ) return; 
    //     if( setLocalPoints ){
    //         const newPoints = [...localPoints];
    //         newPoints[index] = { x: event.target.x(), y: event.target.y() };
    //         setLocalPoints(newPoints);
    //         onSetPoints({points: newPoints, factor, index}, null)
    //     }
    // }

    const handleDragMove = (event: any, index: number) => {
        if (draggable === false) return;
        if (setLocalPoints) {
            const newPoints = [...localPoints];
            newPoints[index] = { x: event.target.x(), y: event.target.y() };
            setLocalPoints(newPoints);
        }
    };
    
    const handleDragEnd = (event: any, index: number) => {
        if (draggable === false) return;
        if (setLocalPoints) {
            const newPoints = [...localPoints];
            newPoints[index] = { x: event.target.x(), y: event.target.y() };
            onSetPoints({ points: newPoints, factor, index }, null);
        }
    };



    return (
        <>
            {localPoints.map((point, index) => (
                <Group key={index}>
                    <Image
                        image={isPixelSize ? icon : (index === 0 ? iconRed : iconGreen)}
                        x={point.x}
                        y={point.y}
                        width={MARKS_WIDTH / resizeFactor} 
                        height={MARKS_WIDTH / resizeFactor} 
                        offsetX={MARKS_OFFSET_X / resizeFactor}
                        offsetY={MARKS_OFFSET_Y / resizeFactor}
                        onMouseEnter={draggable ? handleCursorEnter : undefined}
                        onMouseLeave={draggable ? handleCursorLeave: undefined}
                        draggable={draggable}
                        // onDragEnd={(event) => handleDragPoint(event, index)}
                        onDragMove={(event) => handleDragMove(event, index)}
                        onDragEnd={(event) => handleDragEnd(event, index)}
                        />
                        {
                            activeStep === PIXEL_SIZE_STEP_NUMBER && (
                                <Text
                                    x={(point.x - MARKS_NUMBER_OFFSET_X / resizeFactor)}
                                    y={(point.y - MARKS_NUMBER_OFFSET_Y / resizeFactor)}
                                    text={index === 0 ? "1" : "2"}
                                    fontSize={15 / resizeFactor}
                                    fill="white"
                                />
                            )
                        }
                    
                </Group>
            ))}
        </>
    );
}
