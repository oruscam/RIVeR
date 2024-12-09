import { Group } from "react-konva"
import { useSectionSlice, useUiSlice } from "../hooks"
import { Points } from "./Points"
import { LineAndText } from "./LineAndText"


interface DrawSections {
    localPoints?: { x: number; y: number }[],
    setLocalPoints?: (dirPoints: { x: number; y: number }[]) => void,
    factor:  number,
    draggable: boolean,
    drawPins? : boolean
    resizeFactor?: number
}

export const DrawSections = ({ factor, setLocalPoints, draggable, localPoints, drawPins, resizeFactor} : DrawSections) => {
    const { sections, activeSection, onSetDirPoints } = useSectionSlice();
    const { drawLine } = sections[activeSection]
    const { seeAll } = useUiSlice();
  
    return (
        <>
            {
                localPoints 
                ?
                (
                    <Group>
                        {
                            localPoints.length === 2 && drawLine && (
                                <LineAndText localPoints={localPoints} isPixelSize={activeSection === 0} resizeFactor={resizeFactor} factor={factor} index={activeSection}></LineAndText>
                            )
                        }
                        <Points localPoints={localPoints} setPointsInStore={onSetDirPoints} setLocalPoints={setLocalPoints} draggable={true} module={activeSection === 0 ? 'pixelSize' : 'xSections'} factor={factor} resizeFactor={resizeFactor}/>
                    </Group>
                )             
                : sections.map((section, index) => {
                    if( section.dirPoints.length === 0 || section.name === 'pixel_size') return;
                    if(seeAll && activeSection !== index) return;
                    const reducedPoints = section.dirPoints.map(point => {
                        return {
                            x: point.x / factor,
                            y: point.y / factor
                        }
                    })
                    return (
                        <Group key={index}>
                            <LineAndText isPixelSize={false} resizeFactor={resizeFactor} factor={factor} index={index}></LineAndText>
                            {
                                ( setLocalPoints || drawPins ) && (
                                    <Points localPoints={reducedPoints} setPointsInStore={onSetDirPoints} setLocalPoints={setLocalPoints} draggable={draggable? index === activeSection : false} module={activeSection === 0 ? 'pixelSize' : 'xSections'} factor={factor} resizeFactor={resizeFactor}></Points>
                                )
                            }
                        </Group>
                    )
                })
                
            }
        </>
    )
}
