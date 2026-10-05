import { LIMITS } from '../api/types';
import { newSectionKey, type SectionDraft } from './draft';
import { Field } from './Field';
import type { Errors } from './validate';

interface Props {
  sections: SectionDraft[];
  onChange(sections: SectionDraft[]): void;
  errors: Errors;
}

export function SectionsEditor({ sections, onChange, errors }: Props) {
  const update = (i: number, patch: Partial<SectionDraft>) =>
    onChange(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const remove = (i: number) => onChange(sections.filter((_, j) => j !== i));
  const move = (i: number, by: -1 | 1) => {
    const next = [...sections];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    onChange(next);
  };
  const add = () => onChange([...sections, { key: newSectionKey(), title: '', body: '' }]);
  const full = sections.length >= LIMITS.sections;

  return (
    <section className="panel" aria-labelledby="sections-heading">
      <h2 id="sections-heading">Sections</h2>
      {sections.length === 0 && <p className="hint">No sections yet.</p>}
      {sections.map((s, i) => (
        <fieldset key={s.key} className="section">
          <legend>Section {i + 1}</legend>
          <Field
            label="Title"
            required
            value={s.title}
            onChange={(title) => update(i, { title })}
            error={errors[`sections.${i}.title`]}
          />
          <Field
            label="Text"
            multiline
            value={s.body}
            onChange={(body) => update(i, { body })}
            error={errors[`sections.${i}.body`]}
          />
          <div className="row">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move section ${i + 1} up`}>
              Move up
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === sections.length - 1}
              aria-label={`Move section ${i + 1} down`}
            >
              Move down
            </button>
            <button type="button" className="danger" onClick={() => remove(i)} aria-label={`Remove section ${i + 1}`}>
              Remove
            </button>
          </div>
        </fieldset>
      ))}
      {errors.sections && <p className="error">{errors.sections}</p>}
      <button type="button" onClick={add} disabled={full}>
        Add section
      </button>
      {full && <p className="hint">You have reached the limit of {LIMITS.sections} sections.</p>}
    </section>
  );
}
