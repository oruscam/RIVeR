import './components.css';
import { useUiSlice } from '../hooks/useUiSlice';

export const Info = () => {
  const { info } = useUiSlice();

  return (
    <div className="message-region" id="info-message-div" aria-live="polite">
      {info.length !== 0 && (
        <div className="info">
          {info.map((value, key) => (
            <div key={key} className="info-text">
              {value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
