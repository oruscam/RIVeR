import { useSectionSlice } from "../../../hooks"
import { MaskCreation } from "./MaskCreation"
import { PixelCoordinates } from "./PixelCoordinates"
import { RealWorldCoordinates } from "./RealWorldCoordinates"

export const HardModeCrossSections = ({ extraFields, name }: { extraFields: boolean, name: string }) => {
    const { onSetRealWorld, onSetDirPoints } = useSectionSlice()

    return (
        <div className={extraFields ? 'mt-5 hard-mode-processing' : 'hidden'} style={{ paddingLeft: 0, paddingRight: 0 }}>


            <RealWorldCoordinates section={name} step={4} onSetRealWorld={onSetRealWorld} showUnitLabel />

            <PixelCoordinates section={name} step={4} onSetDirPoints={onSetDirPoints} />
            <span className='divider-line mt-2 mb-1' />
            <MaskCreation />
            <span className='divider-line mb-2' />
            <span id={`span-footer-${name}`} />
            <span id={`${name}-form-cross-section-footer`} />

        </div>
    )
}