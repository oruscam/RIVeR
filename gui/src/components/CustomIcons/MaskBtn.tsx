import React from 'react';
import { Icons } from './Icons';
import { useRipple } from './useRipple';

type MaskBtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: 'md' | 'sm';
};

export const MaskBtn: React.FC<MaskBtnProps> = ({ onClick, className = '', style, size = 'md', ...props }) => {
  const [rpl, fire] = useRipple();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Previene comportamientos raros

    // Disparamos la ondita con el color neutro que se adapta a tu tema
    fire('var(--primary-text-color, #888)');

    // Soltamos el foco para que no quede preseleccionado
    e.currentTarget.blur();

    // Ejecutamos la función que le pases desde el componente padre
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <button
      {...props}
      type="button"
      className={`ibtn${size === 'sm' ? ' ibtn-sm' : ''} ${className}`}
      style={style}
      onClick={handleClick}
    >
      {rpl}
      {/* Dejamos un solo ícono (el de la caja punteada).
              Al usar "currentColor", se pintará solo de blanco/negro según el hover.
            */}
      <span className="cl show" style={{ display: 'flex' }}>
        {Icons.MaskAdd('currentColor')}
      </span>
    </button>
  );
};
