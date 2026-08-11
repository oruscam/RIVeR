import { useRipple } from './useRipple';
import { Icons } from './Icons';

interface EditMaskBtnProps {
  active: boolean;
  action: (index: number) => void;
  index: number;
}

export function EditMaskBtn({ action, index, active }: EditMaskBtnProps) {
  const [rpl, fire] = useRipple();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fire('var(--primary-text-color, #888)');
    action(index);
  };

  return (
    <button type="button" className="ib" onClick={handleClick}>
      {rpl}
      <span className="cl show">
        {active ? Icons.PincelCrossed('currentColor') : Icons.Pincel('currentColor')}
      </span>
    </button>
  );
}
