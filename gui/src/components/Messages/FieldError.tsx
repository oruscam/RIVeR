import './messages.css';
import { useUiSlice } from '../../hooks/useUiSlice';

/**
 * Inline error for exactly one named field, rendered directly under it (the
 * caller places `<FieldError name="start" />` right after the input). Reads
 * uiSlice's fieldErrors map (Task 1) — the field's own onBlur/onSubmit
 * handler is what calls onSetFieldError/onClearFieldError (Tasks 14–19).
 */
export const FieldError = ({ name }: { name: string }) => {
  const { fieldErrors } = useUiSlice();
  const message = fieldErrors[name];

  if (!message) return null;

  return (
    <div className="field-error" role="alert">
      {message}
    </div>
  );
};
