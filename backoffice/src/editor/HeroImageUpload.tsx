import { useId, useState, type ChangeEvent } from 'react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { API_URL } from '../config';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const TOO_LARGE = 'Image must be 2 MB or smaller.';
export const WRONG_TYPE = 'Only JPEG, PNG or WebP images.';

interface Props {
  value: string;
  onChange(url: string): void;
}

// Checks size and type before uploading. The API checks both again.
export function checkImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return WRONG_TYPE;
  if (file.size > MAX_IMAGE_BYTES) return TOO_LARGE;
  return null;
}

export function HeroImageUpload({ value, onChange }: Props) {
  const { request } = useAuth();
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    setError(null);

    const problem = checkImage(file);
    if (problem) {
      setError(problem);
      input.value = '';
      return;
    }

    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const res = await request<{ url: string }>('/api/uploads/hero', { method: 'POST', form });
      onChange(res.url);
    } catch (err) {
      if (err instanceof ApiError && err.status === 413) setError(TOO_LARGE);
      else if (err instanceof ApiError && err.status === 415) setError(WRONG_TYPE);
      else setError(err instanceof ApiError ? err.message : 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  return (
    <div className={error ? 'field field--error' : 'field'}>
      <label htmlFor={id}>Hero image</label>
      {value && <img className="preview" src={`${API_URL}${value}`} alt="Current hero image" />}
      <input
        id={id}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        onChange={onFile}
        disabled={uploading}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
      />
      <p id={`${id}-hint`} className="hint">
        JPEG, PNG or WebP, up to 2 MB.
      </p>
      {uploading && <p role="status">Uploading…</p>}
      {error && (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      )}
      {value && !uploading && (
        <button type="button" className="danger" onClick={() => onChange('')}>
          Remove image
        </button>
      )}
    </div>
  );
}
