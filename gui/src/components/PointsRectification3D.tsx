import { useMatrixSlice } from "../hooks";
import { pinRed, pin }from '../assets/icons/icons'
import useImage from "use-image";
import { Group, Image, Text } from "react-konva";
import { COLORS, MARKS } from "../constants/constants";
import { KonvaEventObject } from "konva/lib/Node";
import { useEffect, useState } from "react";

interface PointsProps {
    factor: number,
    resizeFactor: number;
}

export const PointsRectification3D = ({ factor, resizeFactor } : PointsProps) => {
    const { ipcam, setIpcamPointPixelCoordinates } = useMatrixSlice()
    const { activePoint, importedPoints } = ipcam

    if (importedPoints === undefined ) return null;

    const [iconBlue] = useImage(pin)
    const [iconRed] = useImage(pinRed)

    const [ localPoints, setLocalPoints ] = useState(importedPoints)

    //  CAMBIA EL ESTILO DEL POINTER CUANDO PASA POR ENCIMA DE UN PUNTO
    const handleCursorEnter = ( event: KonvaEventObject<MouseEvent> ) => {
        const stage = event.target.getStage();
        if( stage ){
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
        if (localPoints) {
            const newPoints = localPoints.map((p, i) => 
                i === index ? { ...p, x: event.target.x() * factor, y: event.target.y() * factor } : p
            );
            setLocalPoints(newPoints);
        }
    };
    
    const handleDragEnd = (event: any, index: number, draggable: boolean) => {
        if (draggable === false) return;
        if (importedPoints) {
            const point = {
                x: parseFloat((event.target.x() * factor).toFixed(2)),
                y: parseFloat((event.target.y() * factor).toFixed(2)),
            }

            setIpcamPointPixelCoordinates({ index, point })
        }
    };

    useEffect(() => {
        setLocalPoints(importedPoints)
    }, [importedPoints])
    
    return (
        <>
            {
                localPoints.map((point, index) => {
                    if (point.wasEstablished === false && activePoint !== index || point.selected === false) return null
                    const draggable = activePoint === index

                    return (
                        <Group key={index}>
                            <Image
                                image={activePoint === index ? iconRed : iconBlue}
                                x={point.x / factor}
                                y={point.y / factor}
                                width={MARKS.WIDTH / resizeFactor} 
                                height={MARKS.HEIGHT / resizeFactor} 
                                offsetX={MARKS.OFFSET_X / resizeFactor}
                                offsetY={MARKS.OFFSET_Y / resizeFactor}
                                onMouseEnter={draggable ? handleCursorEnter : undefined}
                                onMouseLeave={draggable ? handleCursorLeave: undefined}
                                draggable={draggable}
                                onDragMove={(event) => handleDragMove(event, index)}
                                onDragEnd={(event) => handleDragEnd(event, index, draggable)}
                            />
                            <Text
                                text={point.label}
                                x={point.x / factor}
                                y={point.y / factor}
                                fontSize={14 / resizeFactor}
                                fill={ activePoint === index ? COLORS.TRANSPARENT : COLORS.LIGHT_BLUE}
                                offset={{ x: 22 / resizeFactor, y: -5 /resizeFactor }}
                            />
                        </Group>
                    )
                })
            }
        </>

    );
}