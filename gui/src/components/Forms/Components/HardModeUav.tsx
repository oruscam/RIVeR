import { useEffect } from "react"
import { useUavSlice } from "../../../hooks"
import { PixelCoordinates } from "./PixelCoordinates"
import { RealWorldCoordinates } from "./RealWorldCoordinates"

export const HardModeUav = ({extraFields}: {extraFields: boolean}) => {
    const { onSetPixelDirection, onSetPixelRealWorld } = useUavSlice()

    useEffect(() => {
        if (extraFields === true){
            const element = document.getElementById('span-footer');
            const element2 = document.getElementById('hard-mode-uav');
            if ( element2 ) {
                element2.style.display = ''
            }
            element?.scrollIntoView({ behavior: 'smooth' });
        } else {
            const element = document.getElementById('hard-mode-uav');
            if ( element ) {
                setTimeout(() => {
                    element.style.display = 'none'
                }, 290);
            }
        }
    }, [extraFields])

    return (
        <div className={`div-with-effect ${extraFields ? '' : 'hiddens'}`} id='hard-mode-uav'>
            <RealWorldCoordinates step={3} onSetRealWorld={onSetPixelRealWorld} />
            <PixelCoordinates  step={3} onSetDirPoints={onSetPixelDirection} />
            <span id="span-footer"></span>
        </div>

    )
}