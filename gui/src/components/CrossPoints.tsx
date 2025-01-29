import { Group, Line } from "react-konva"
import { useMatrixSlice } from "../hooks"
import { COLORS } from "../constants/constants"
import React from "react"

export const CrossPoints = ({factor}) => {
    const { ipcam } = useMatrixSlice()
    const { importedPoints, activePoint } = ipcam
    return (
        <Group>
            {
                importedPoints?.map((point, index) => {
                    if (point.x === 0 && point.y === 0) return null
                    return (
                        <React.Fragment>
                            <Line
                                key={`line1-${index}`}
                                points={[
                                    point.x / factor - 18 / factor,
                                    point.y / factor - 18 / factor,
                                    point.x / factor + 18 / factor,
                                    point.y / factor + 18 / factor,
                                ]}
                                stroke={ point.selected ? COLORS.LIGHT_BLUE : COLORS.DARK_GREY }
                                strokeWidth={5 / factor}
                            />
                            <Line
                                key={`line2-${index}`}
                                points={[
                                        point.x / factor - 18 / factor,
                                        point.y / factor + 18 / factor,
                                        point.x / factor + 18 / factor,
                                        point.y / factor - 18 / factor
                                ]}
                                // stroke={ index === activePoint ? COLORS.RED : COLORS.LIGHT_BLUE }
                                stroke={ point.selected ? COLORS.LIGHT_BLUE : COLORS.DARK_GREY }
                                strokeWidth={5 / factor}
                            />
                        </React.Fragment>
                    )
                })
            }
        </Group>
    )
}