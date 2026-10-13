import type { InputHTMLAttributes } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name' | 'onChange' | 'onBlur' | 'ref'> {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  hint?: string;
}

/** Labelled input with an associated, announced error message (WCAG 2.2 AA). */
export function Field({ id, label, registration, error, hint, ...inputProps }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...registration} {...inputProps} aria-invalid={error ? true : undefined} aria-describedby={describedBy} />
      {hint && <small id={hintId} className="field-hint">{hint}</small>}
      {error && <p id={errorId} className="field-error" role="alert">{error}</p>}
    </div>
  );
}
