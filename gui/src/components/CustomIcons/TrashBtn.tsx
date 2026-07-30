import { useState, useRef } from 'react';
import { useRipple } from './useRipple';
import { Icons } from './Icons';

type TrashBtnProps = {
  onClickFunction: () => void;
};

export function TrashBtn({ onClickFunction }: TrashBtnProps) {
  const [armed, setArmed] = useState(false);
  const [rpl, fire] = useRipple();
  const timerRef = useRef<any>(null);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fire('rgba(255, 255, 255, 0.4)');
    if (!armed) {
      setArmed(true);
      timerRef.current = setTimeout(() => setArmed(false), 2500);
    } else {
      clearTimeout(timerRef.current);
      setArmed(false);
    }
    (e.currentTarget as HTMLButtonElement).blur();
    onClickFunction();
  };
  return (
    <button type="button" className={`ib ib-danger ${armed ? 'is-armed' : ''}`} onClick={onClick}>
      {rpl}
      <span className="cl show" style={{ display: 'flex' }}>
        {Icons.Trash('currentColor')}
      </span>
    </button>
  );
}
