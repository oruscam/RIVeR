import { useRipple } from '../useRipple';
import { Icons } from '../Icons';

interface PlayBtnProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  control: { play: boolean };
  setControl: React.Dispatch<React.SetStateAction<{ play: boolean; volume: boolean }>>;
}

/* ── 7. PLAY/PAUSE ── */
export function PlayBtn({ videoRef, control, setControl }: PlayBtnProps) {
  const handlePlay = () => {
    fire('var(--primary-text-color, #888)');
    if (videoRef.current) {
      videoRef.current.play();
      setControl((prev) => ({ ...prev, play: true }));
    }
    return;
  };

  const handlePause = () => {
    fire('var(--primary-text-color, #888)');
    if (videoRef.current) {
      videoRef.current.pause();
      setControl((prev) => ({ ...prev, play: false }));
    }
    return;
  };

  const [rpl, fire] = useRipple();
  return (
    <button
      type="button"
      className={`ib ${control.play ? '' : ''}`}
      onClick={control.play ? handlePause : handlePlay}
    >
      {rpl}
      <span className="cl show">{control.play ? Icons.Pause('currentColor') : Icons.Play('currentColor')}</span>
    </button>
  );
}
