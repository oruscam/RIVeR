import './components.css';
import { useUiSlice } from '../hooks/useUiSlice';

export const Warning = () => {
  const { warning } = useUiSlice();

  return (
    <div className="message-region" id="warning-message-div" aria-live="polite">
      {warning.length !== 0 && (
        <div className="warning">
          {warning.map((value, key) => (
            <div key={key} className="warning-text">
              {value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
