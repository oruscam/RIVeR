import { useSectionSlice } from "../../../hooks"
import { PixelCoordinates } from "./PixelCoordinates"
import { RealWorldCoordinates } from "./RealWorldCoordinates"

export const HardModeCrossSections = ({ extraFields, name }: { extraFields: boolean, name: string }) => {
    const { onSetRealWorld, onSetDirPoints } = useSectionSlice()

    return (
        <div className={extraFields ? 'mt-3' : 'hidden'}>
            <RealWorldCoordinates section={name} step={4} onSetRealWorld={onSetRealWorld}/>
            <PixelCoordinates section={name} step={4} onSetDirPoints={onSetDirPoints}/>
            <span id={`span-footer-${name}`}/>
            <span id={`${name}-form-cross-section-footer`} />
        </div>
    )
}