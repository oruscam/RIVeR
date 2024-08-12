import { Group, Line, Rect } from "react-konva"
import { getDistanceBetweenPoints } from "../helpers"
import { useSectionSlice } from "../hooks"

export const DrawSections = ({ factor } : { factor: {x: number, y: number }}) => {
    const { sections } = useSectionSlice()

    const getAngle = ( points: { x: number, y: number }[] ) => {
        const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) * (180 / Math.PI)
        return angle
    }


    return (
            sections.map((section: any, index: any) => {
                if(index !== 0){
                    const { points } = section
                    const reducedPoints = [{
                            x: points[0].x / factor.x,
                            y: points[0].y / factor.y
                        },
                        {
                            x: points[1].x / factor.x,
                            y: points[1].y / factor.y
                        }]
                    return (
                        <Group key={index}          >
                            <Rect
                                x={reducedPoints[0].x}
                                y={reducedPoints[0].y}
                                width={getDistanceBetweenPoints(reducedPoints)}
                                height={50}
                                rotation={getAngle(reducedPoints)}
                                offsetY={25}
                                fill="rgba(0,0,0,0.5)"
                                rounded={true}
                            />
                            <Line   fill="black" 
                                    points={[reducedPoints[0].x, reducedPoints[0].y, reducedPoints[1].x, reducedPoints[1].y]}
                                    stroke={"1"}
                                    strokeWidth={1.2}
                            />
                        </Group>
                    )
                } else {
                    return null
                }
            })
    )

}
