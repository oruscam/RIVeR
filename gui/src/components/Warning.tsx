import './components.css';
import { useUiSlice } from '../hooks/useUiSlice';

export const Warning = () => {
  const { warning } = useUiSlice();

  return (
    <div className="warning" style={{ opacity: warning.length !== 0 ? 1 : 0 }} id="warning-message-div">
      {warning.map((value, key) => (
        <div key={key} className="warning-text">
          - {value}
        </div>
      ))}
    </div>
  );
};
