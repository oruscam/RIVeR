import React from 'react';
import { useRipple } from './useRipple';

type ConfirmMaskBtnProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const ConfirmMaskBtn: React.FC<ConfirmMaskBtnProps> = ({ onClick, className = '', style, ...props }) => {
  const [rpl, fire] = useRipple();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fire('rgba(255,255,255,0.4)');
    e.currentTarget.blur();
    if (onClick) onClick(e);
  };

  return (
    <button
      {...props}
      type="button"
      className={`confirm-mask-btn ${className}`}
      style={{
        background: '#ED6B57',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.2s ease',
        ...style,
      }}
      onClick={handleClick}
    >
      {rpl}
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </button>
  );
};
