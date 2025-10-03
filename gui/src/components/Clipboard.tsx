import { clipboard } from '../assets/icons/icons';
import { Icon } from './Icon';
import { useState, useRef } from 'react';

type ClipboardProps = {
  onClickFunction: () => void;
};

export const Clipboard = ({ onClickFunction }: ClipboardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Trigger animation
    setIsAnimating(true);

    // Call the original function
    onClickFunction();

    // Remove animation class after animation completes
    timeoutRef.current = setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  };

  return (
    <div className="clipboard-container" onClick={handleClick}>
      <Icon path={clipboard} className={`clipboard ${isAnimating ? 'clipboard-clicked' : ''}`} />
    </div>
  );
};
