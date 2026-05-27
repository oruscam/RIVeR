import React from 'react';
import { Icons } from '../Icons';
import { useRipple } from '../useRipple';
import { useProjectSlice } from '../../../hooks';

interface FrameBtnProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    direction: 'back' | 'next';
    onClick?: () => void;
}

export function FrameBtn({ direction, onClick, videoRef }: FrameBtnProps) {
    const { video } = useProjectSlice();
    const fps = video.data?.fps || 30;
    const [rpl, fire] = useRipple();

    const handlePrevious = () => {
        if (!videoRef.current || fps <= 0) return;

        const stepInput = document.getElementById('input-step') as HTMLInputElement;
        const step = stepInput ? parseFloat(stepInput.value) || 1 : 1;

        videoRef.current.currentTime -= (1 / fps) * step;
    };

    const handleNext = () => {
        if (!videoRef.current || fps <= 0) return;

        const stepInput = document.getElementById('input-step') as HTMLInputElement;
        const step = stepInput ? parseFloat(stepInput.value) || 1 : 1;

        videoRef.current.currentTime += (1 / fps) * step;
    };

    const handleClick = () => {
        fire("var(--primary-text-color, #888)");

        if (direction === 'back') {
            handlePrevious();
        } else {
            handleNext();
        }

        if (onClick) onClick();
    };


    return (
        <button
            type='button'
            className="ib"
            onClick={handleClick}
        >
            {rpl}
            <span className="cl show">
                {direction === 'back'
                    ? Icons.FrameBack("currentColor")
                    : Icons.FrameNext("currentColor")
                }
            </span>
        </button>
    );
}