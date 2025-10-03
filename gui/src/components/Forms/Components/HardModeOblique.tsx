import { useObliqueSlice } from "../../../hooks"
import { PixelCoordinates } from "./PixelCoordinates"
import { RealWorldCoordinates } from "./RealWorldCoordinates"

export const HardModeOblique = ({extraFields} : {extraFields: boolean}) => {
    const { onChangeCoordinates, onChangeRealWorldCoordinates} = useObliqueSlice()

    return (
        <div className={extraFields ? '' : 'hidden'}>
            <RealWorldCoordinates step={3} onSetRealWorld={onChangeRealWorldCoordinates}/>
            <PixelCoordinates step={3} onSetDirPoints={onChangeCoordinates}/>
            <span id="span-footer"/>
        </div>
    )
}