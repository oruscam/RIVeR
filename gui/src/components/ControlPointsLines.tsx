import { Line } from "react-konva"
import { Point } from "../types"
import { COLORS } from "../constants/constants"

export const ControlPointsLines = ({ localPoints, resizeFactor }) => {
    const { D12, D23, D34, D14, D13, D24 } = COLORS.CONTROL_POINTS

    const getLineColor = ( index: number ) => {
        switch (index) {
            case 0:
                return D12
            case 1:
                return D23
            case 2:
                return D34
            case 3:
                return D14
                               
            default:
                return 'black'
        }

    }
    
    return (
        <>
            {
                localPoints.map((point: Point, index: number) => {
                    const value = index === 3 ? -3 : 1
                    return (
                        <Line
                            key={index}
                            points={ [point.x, point.y, localPoints[index + value].x, localPoints[index + value].y] }
                            strokeWidth={3 / resizeFactor}
                            stroke={getLineColor(index)}
                            
                        />
                    )
                })
            }
            <Line
                points={ [localPoints[0].x, localPoints[0].y, localPoints[2].x, localPoints[2].y] }
                strokeWidth={3 / resizeFactor}
                stroke={D13}
            />
            <Line
                points={ [localPoints[1].x, localPoints[1].y, localPoints[3].x, localPoints[3].y] }
                strokeWidth={3 / resizeFactor}
                stroke={D24}
            />
        </>
  )
}
