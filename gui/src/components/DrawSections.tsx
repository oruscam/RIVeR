import { Group } from "react-konva"
import { useSectionSlice } from "../hooks"
import { Points } from "./Points"
import { LineAndText } from "./LineAndText"


interface DrawSections {
    factor: { x: number; y: number }
    setLocalPoints?: (points: { x: number; y: number }[]) => void,
    draggable: boolean,
    localPoints?: { x: number; y: number }[]
}

export const DrawSections = ({ factor, setLocalPoints, draggable, localPoints} : DrawSections) => {
    const { sections, activeSection } = useSectionSlice();
    const { drawLine, name } = sections[activeSection]

    return (
        <>
            {
                localPoints 
                ?
                (
                    <Group>
                        <Points localPoints={localPoints} setLocalPoints={setLocalPoints} draggable={true} isPixelSize={activeSection === 0} factor={factor}/>
                        {
                            localPoints.length === 2 && drawLine && (
                                <LineAndText name={name} imagePoints={localPoints} isPixelSize={activeSection === 0}></LineAndText>
                            )
                        }
                    </Group>
                )             
                : sections.map((section, index) => {
                    if( section.points.length === 0 || section.name === 'pixel_size') return null

                    const reducedPoints = section.points.map(point => {
                        return {
                            x: point.x / factor.x,
                            y: point.y / factor.y
                        }
                    })

                    return (
                        <Group key={index}>
                            {
                                setLocalPoints && (
                                    <Points localPoints={reducedPoints} setLocalPoints={setLocalPoints} draggable={draggable? index === activeSection : false} isPixelSize={activeSection === 0} factor={factor}></Points>
                                )
                            }
                            <LineAndText name={section.name} imagePoints={reducedPoints} isPixelSize={false}></LineAndText>
                        </Group>
                    )
                })
                
            }
        </>
    )
}
