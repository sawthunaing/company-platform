import { useId } from 'react';

interface FieldProps {
  label: string;
  value: string;
  onChange(value: string): void;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  type?: 'text' | 'email' | 'tel' | 'password';
  autoComplete?: string;
  maxLength?: number;
  hint?: string;
}

// A labelled input or textarea with its error shown right under it.
export function Field({
  label,
  value,
  onChange,
  error,
  required,
  multiline,
  type = 'text',
  autoComplete,
  maxLength,
  hint,
}: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    value,
    required,
    maxLength,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  };

  return (
    <div className={error ? 'field field--error' : 'field'}>
      <label htmlFor={id}>
        {label}
        {required && <span className="required"> (required)</span>}
      </label>
      {multiline ? (
        <textarea {...common} rows={5} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type={type} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && (
        <p id={hintId} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
    </div>
  );
}
