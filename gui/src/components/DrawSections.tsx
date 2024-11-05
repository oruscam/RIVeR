import { Group } from "react-konva"
import { useSectionSlice, useUiSlice } from "../hooks"
import { Points } from "./Points"
import { LineAndText } from "./LineAndText"


interface DrawSections {
    factor:  number,
    setLocalPoints?: (dirPoints: { x: number; y: number }[]) => void,
    draggable: boolean,
    localPoints?: { x: number; y: number }[],
    drawPins? : boolean
    resizeFactor?: number
}

export const DrawSections = ({ factor, setLocalPoints, draggable, localPoints, drawPins, resizeFactor} : DrawSections) => {
    const { sections, activeSection } = useSectionSlice();
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
                        <Points localPoints={localPoints} setLocalPoints={setLocalPoints} draggable={true} isPixelSize={activeSection === 0} factor={factor} resizeFactor={resizeFactor}/>
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
                                (setLocalPoints || drawPins) && (
                                    <Points localPoints={reducedPoints} setLocalPoints={setLocalPoints} draggable={draggable? index === activeSection : false} isPixelSize={activeSection === 0} factor={factor} resizeFactor={resizeFactor}></Points>
                                )
                            }
                        </Group>
                    )
                })
                
            }
        </>
    )
}
