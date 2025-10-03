import { useUavSlice } from "../../../hooks"
import { PixelCoordinates } from "./PixelCoordinates"
import { RealWorldCoordinates } from "./RealWorldCoordinates"

export const HardModeUav = ({extraFields}: {extraFields: boolean}) => {
    const { onSetPixelDirection, onSetPixelRealWorld } = useUavSlice()

    return (
        <div className={extraFields ? 'uav-extra-mode' : 'hidden'}>
            <RealWorldCoordinates step={3} onSetRealWorld={onSetPixelRealWorld} />
            <PixelCoordinates  step={3} onSetDirPoints={onSetPixelDirection} />
            <span id="span-footer"></span>
        </div>
    )
}