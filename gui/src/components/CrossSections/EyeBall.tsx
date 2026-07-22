import { useEffect, useState } from 'react';

interface EyeProps {
  active: boolean;
  action: () => void;
  index?: number;
}
export const EyeBall = ({ active, action, index }: EyeProps) => {
  const [lidClass, setLidClass] = useState('lid lid--open');
  const [pupilClass, setPupilClass] = useState('pupil pupil--open pupil-shadow');

  useEffect(() => {
    if (active) {
      setLidClass('lid lid--open');
      setPupilClass('pupil pupil--open');
    } else {
      setLidClass('lid lid--close');
      setPupilClass('pupil pupil--close');
    }
  }, [active]);

  const handleClick = () => {
    if (index === undefined) {
      action();
    } else {
      action(index);
    }
  };

  return (
    <div className="seeAll-button" onClick={handleClick}>
      <svg className="eye-ball-svg" viewBox="0 0 193.5 116">
        <circle className={`eye ${pupilClass}`} cx="96.8" cy="58" r="24" />
        <path
          className={`eye ${lidClass}`}
          d="M5,58L5,58C23.4,26.3,57.6,5,96.8,5c39.3,0,73.8,21.3,91.8,53l0,0c0,0-26.7,53-91.8,53S5,58,5,58z"
        />
      </svg>
    </div>
  );
};
