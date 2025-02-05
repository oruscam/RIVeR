import { Circle, Group, Line } from "react-konva"
import { COLORS } from "../constants/constants"
import { useMatrixSlice } from "../hooks"

export const RedPoints = ({ factor, resizeFactor }: { factor: number, resizeFactor: number }) => {
    const { ipcam } = useMatrixSlice()
    const { cameraSolution, importedPoints } = ipcam

    if ( cameraSolution === undefined || importedPoints === undefined ) return null
    
    return (
        <Group>
            {
                cameraSolution.projectedPoints.map((point, index) => {
                    const { x, y, selected, wasEstablished } = importedPoints[index]
                    if ( selected === false ) return

                    return (
                        <Group key={`group-${index}`}>
                            { 
                                x !== 0 && y !== 0 && wasEstablished && (
                                    <Line 
                                        key={`line-${index}`}
                                        points={[x / factor, y / factor, point[0] / factor, point[1] / factor]}
                                        stroke={COLORS.RED}
                                        strokeWidth={3 / ( resizeFactor)}
                                    />    
                                )
                            }
                            <Circle
                                key={`circle-${index}`}
                                x={point[0] / factor}
                                y={point[1] / factor}
                                radius={3 / ( resizeFactor)}
                                fill={COLORS.RED}
                            />
                        </Group>
                )}) 
            }
        </Group>
    )
}