import { useObliqueSlice } from "../../../hooks"
import { PixelCoordinates } from "./PixelCoordinates"
import { RealWorldCoordinates } from "./RealWorldCoordinates"

export const HardModeOblique = ({extraFields} : {extraFields: boolean}) => {
    const { onChangeCoordinates, onChangeRealWorldCoordinates} = useObliqueSlice()

    return (
        <div className={extraFields ? 'mt-2' : 'hidden'}>
            <RealWorldCoordinates step={3} onSetRealWorld={onChangeRealWorldCoordinates} showUnitLabel/>
            <PixelCoordinates step={3} onSetDirPoints={onChangeCoordinates}/>
            <span id="span-footer"/>
        </div>
    )
}