import { Group, Image, Text } from 'react-konva'
import { pinRed, pinGreen, pin }from '../assets/icons/icons'
import useImage from 'use-image'
import { KonvaEventObject } from 'konva/lib/Node';
import { COLORS, MARKS, MODULE_NUMBER } from '../constants/constants';
import { useWizard } from 'react-use-wizard';
import { CanvasPoint } from '../types';

interface PointsProps {
    localPoints: { x: number; y: number }[];
    setPointsInStore: (canvasPoint: CanvasPoint, formPoint: null) => void;
    setLocalPoints?: (points: { x: number; y: number }[]) => void;
    draggable?: boolean;
    module?: string;
    factor?: number,
    resizeFactor?: number;
}

export const Points = ({ localPoints = [], setPointsInStore, setLocalPoints, draggable = false, module, factor = 0, resizeFactor = 1}: PointsProps) => {
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

    const handleDragMove = (event: any, index: number) => {
        if (draggable === false) return;
        if (setLocalPoints) {
            const newPoints = [...localPoints];
            newPoints[index] = { x: event.target.x(), y: event.target.y() };

            if (module === 'pixelSize' || module === 'contolPoints') {
                setLocalPoints(newPoints);
                return
            }
            setPointsInStore({ points: newPoints, factor, index, mode: 'only-pixel' }, null);
        }
    };
    
    const handleDragEnd = (event: any, index: number) => {
        if (draggable === false) return;
        if (setLocalPoints) {
            const newPoints = [...localPoints];
            newPoints[index] = { x: event.target.x(), y: event.target.y() };
            setPointsInStore({ points: newPoints, factor, index }, null);
        }
    };

    const getIcon = ( index: number ) => {
        switch (module) {
            case 'pixelSize':
                return icon
            
            case 'xSections':
                if ( index === 0 ) return iconRed
                return iconGreen
            
            case 'controlPoints':
                if  ( index === 0 ) return iconRed
                return icon
        }
    }

    return (
        <>
            {localPoints.map((point, index) => (
                <Group key={index}>
                    <Image
                        image={getIcon(index)}
                        x={point.x}
                        y={point.y}
                        width={MARKS.WIDTH / resizeFactor} 
                        height={MARKS.HEIGHT / resizeFactor} 
                        offsetX={MARKS.OFFSET_X / resizeFactor}
                        offsetY={MARKS.OFFSET_Y / resizeFactor}
                        onMouseEnter={draggable ? handleCursorEnter : undefined}
                        onMouseLeave={draggable ? handleCursorLeave: undefined}
                        draggable={draggable}
                        // onDragEnd={(event) => handleDragPoint(event, index)}
                        onDragMove={(event) => handleDragMove(event, index)}
                        onDragEnd={(event) => handleDragEnd(event, index)}
                        />
                        {
                            activeStep === MODULE_NUMBER.PIXEL_SIZE && (
                                <Text
                                    x={(point.x - MARKS.NUMBER_OFFSET_X / resizeFactor)}
                                    y={(point.y - MARKS.NUMBER_OFFSET_Y / resizeFactor)}
                                    text={(index + 1).toString()}
                                    fontSize={MARKS.NUMBER_FONT_SIZE / resizeFactor}
                                    fill={index === 0 && module === 'controlPoints' ? COLORS.MARK_L : COLORS.MARK_R}
                                    fontStyle='bold'
                                    listening={false}
                                />
                            )
                        }
                        {
                            activeStep === MODULE_NUMBER.CROSS_SECTIONS && (
                                <Text
                                    x={(point.x - MARKS.NUMBER_OFFSET_X / resizeFactor)}
                                    y={(point.y - MARKS.NUMBER_OFFSET_Y / resizeFactor)}
                                    text={index === 0 ? 'L' : 'R'}
                                    fontSize={MARKS.LETTER_FONT_SIZE / resizeFactor}
                                    fill={index === 0 ? COLORS.MARK_L : COLORS.MARK_R}
                                    fontStyle='bold'
                                    listening={false}
                                />
                            )
                        }
                </Group>
            ))}
        </>
    );
}
