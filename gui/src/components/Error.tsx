import './components.css';
import { useUiSlice } from '../hooks/useUiSlice';

export const Error = () => {
  const { error } = useUiSlice();
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return (
    <div className="message-region" id="error-message-div" aria-live="assertive">
      {error.length !== 0 && (
        <div className="error">
          {error.map((value, key) => {
            const parts = value.split(urlRegex);

            return (
              <div key={key} className="error-text">
                {parts.map((part, index) =>
                  urlRegex.test(part) ? (
                    <a
                      key={index}
                      href={part}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="error-message-link"
                    >
                      {part}
                    </a>
                  ) : (
                    <span key={index}>{part}</span>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
