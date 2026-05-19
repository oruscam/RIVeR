import { useRipple } from '../useRipple';
import { Icons } from '../Icons';

interface SoundBtnProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    control: { volume: boolean };
    setControl: React.Dispatch<React.SetStateAction<{ play: boolean; volume: boolean }>>;
}

export function SoundBtn({ videoRef, control, setControl }: SoundBtnProps) {
    const [rpl, fire] = useRipple();

    const handleToggle = () => {
        fire('var(--primary-text-color, #888)');
        const newMuted = !control.volume;
        if (videoRef.current) {
            videoRef.current.muted = newMuted;
        }
        setControl((prev) => ({ ...prev, volume: newMuted }));
    };

    return (
        <button type="button" className="ib" onClick={handleToggle}>
            {rpl}
            <span className="cl show">
                {control.volume ? Icons.SoundOff('currentColor') : Icons.SoundOn('currentColor')}
            </span>
        </button>
    );
}
