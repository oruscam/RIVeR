import { useState } from "react";
import { useUiSlice } from "../../hooks";

export const EyeBall = () => {
    const [lidClass, setLidClass] = useState('lid lid--close');
    const [pupilClass, setPupilClass] = useState('pupil pupil--close pupil--shadow');
    const { onSetSeeAll, seeAll } = useUiSlice()

    const handleClick = () => {
        if(!seeAll){
            setLidClass('lid lid--close');
            setPupilClass('pupil pupil--close');
        } else{
            setLidClass('lid lid--open');
            setPupilClass('pupil pupil--open');
        }
        onSetSeeAll()
    };

    return (
        <div>
            <div className="seeAll-button" onClick={handleClick}>
                <svg className="eye-ball-svg" viewBox="0 0 193.5 116">
                    <circle className={`eye ${pupilClass}`} cx="96.8" cy="58" r="24"/>
                    <path className={`eye ${lidClass}`} d="M5,58L5,58C23.4,26.3,57.6,5,96.8,5c39.3,0,73.8,21.3,91.8,53l0,0c0,0-26.7,53-91.8,53S5,58,5,58z"/>
                </svg>
            </div>
        </div>
    );
}
