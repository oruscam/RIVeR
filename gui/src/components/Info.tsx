import './components.css';
import { useUiSlice } from '../hooks/useUiSlice';

export const Info = () => {
  const { info } = useUiSlice();

  return (
    <div className="info" style={{ opacity: info.length !== 0 ? 1 : 0 }} id="info-message-div">
      {info.map((value, key) => (
        <div key={key} className="info-text">
          - {value}
        </div>
      ))}
    </div>
  );
};
