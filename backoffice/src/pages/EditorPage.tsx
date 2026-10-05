import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { LIMITS, type HomeContentResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { toDraft, toPayload, type Draft } from '../editor/draft';
import { Field } from '../editor/Field';
import { HeroImageUpload } from '../editor/HeroImageUpload';
import { SectionsEditor } from '../editor/SectionsEditor';
import { validate, type Errors } from '../editor/validate';

type Status = { kind: 'success' | 'error'; text: string } | null;

export function EditorPage() {
  const { request, logout } = useAuth();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setDraft(toDraft(await request<HomeContentResponse>('/api/home')));
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'Could not load the content.');
    }
  }, [request]);

  useEffect(() => {
    void load();
  }, [load]);

  // After the first save attempt, errors update as the user types.
  const change = (next: Draft) => {
    setDraft(next);
    setStatus(null);
    if (submitted) setErrors(validate(next));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSubmitted(true);
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus({ kind: 'error', text: 'Fix the highlighted fields before saving.' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const saved = await request<HomeContentResponse>('/api/home', { method: 'PUT', json: toPayload(draft) });
      setDraft(toDraft(saved));
      setStatus({ kind: 'success', text: 'Saved. The changes are live in the API.' });
    } catch (err) {
      const text = err instanceof ApiError ? err.message : 'Save failed.';
      setStatus({ kind: 'error', text: `Save failed: ${text}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <h1>Home page content</h1>
        <button type="button" onClick={() => void logout()}>
          Log out
        </button>
      </header>

      {loadError && (
        <div className="message message--error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {!draft && !loadError && <p role="status">Loading…</p>}

      {draft && (
        <form onSubmit={save} noValidate>
          <section className="panel" aria-labelledby="hero-heading">
            <h2 id="hero-heading">Hero</h2>
            <Field
              label="Hero title"
              required
              value={draft.heroTitle}
              onChange={(heroTitle) => change({ ...draft, heroTitle })}
              error={errors.heroTitle}
              hint={`Up to ${LIMITS.heroTitle} characters.`}
            />
            <Field
              label="Hero subtitle"
              multiline
              value={draft.heroSubtitle}
              onChange={(heroSubtitle) => change({ ...draft, heroSubtitle })}
              error={errors.heroSubtitle}
            />
            <HeroImageUpload value={draft.heroImageUrl} onChange={(heroImageUrl) => change({ ...draft, heroImageUrl })} />
          </section>

          <SectionsEditor sections={draft.sections} onChange={(sections) => change({ ...draft, sections })} errors={errors} />

          <section className="panel" aria-labelledby="contact-heading">
            <h2 id="contact-heading">Contact info</h2>
            <Field
              label="Contact email"
              type="email"
              value={draft.contact.email}
              onChange={(email) => change({ ...draft, contact: { ...draft.contact, email } })}
              error={errors['contact.email']}
            />
            <Field
              label="Phone"
              type="tel"
              value={draft.contact.phone}
              onChange={(phone) => change({ ...draft, contact: { ...draft.contact, phone } })}
              error={errors['contact.phone']}
            />
            <Field
              label="Address"
              multiline
              value={draft.contact.address}
              onChange={(address) => change({ ...draft, contact: { ...draft.contact, address } })}
              error={errors['contact.address']}
            />
          </section>

          <div className="savebar">
            {status && (
              <p
                className={`message message--${status.kind}`}
                role={status.kind === 'error' ? 'alert' : 'status'}
              >
                {status.text}
              </p>
            )}
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
