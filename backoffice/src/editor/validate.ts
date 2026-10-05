import { LIMITS } from '../api/types';
import type { Draft } from './draft';

// Field path → message. Paths: heroTitle, sections.0.title, contact.email, …
export type Errors = Record<string, string>;

// Same rules as the API's HomeContentDto, so a form that passes here is accepted there.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validate(draft: Draft): Errors {
  const errors: Errors = {};
  const tooLong = (value: string, max: number) => value.trim().length > max;

  if (!draft.heroTitle.trim()) errors.heroTitle = 'Hero title is required.';
  else if (tooLong(draft.heroTitle, LIMITS.heroTitle)) {
    errors.heroTitle = `Hero title must be ${LIMITS.heroTitle} characters or fewer.`;
  }

  if (tooLong(draft.heroSubtitle, LIMITS.heroSubtitle)) {
    errors.heroSubtitle = `Hero subtitle must be ${LIMITS.heroSubtitle} characters or fewer.`;
  }

  if (draft.sections.length > LIMITS.sections) {
    errors.sections = `You can have at most ${LIMITS.sections} sections.`;
  }
  draft.sections.forEach((s, i) => {
    if (!s.title.trim()) errors[`sections.${i}.title`] = 'Section title is required.';
    else if (tooLong(s.title, LIMITS.sectionTitle)) {
      errors[`sections.${i}.title`] = `Section title must be ${LIMITS.sectionTitle} characters or fewer.`;
    }
    if (s.body.length > LIMITS.sectionBody) {
      errors[`sections.${i}.body`] = `Section text must be ${LIMITS.sectionBody} characters or fewer.`;
    }
  });

  const email = draft.contact.email.trim();
  if (email && !EMAIL.test(email)) errors['contact.email'] = 'Enter a valid email address, like name@company.com.';
  if (tooLong(draft.contact.phone, LIMITS.phone)) {
    errors['contact.phone'] = `Phone must be ${LIMITS.phone} characters or fewer.`;
  }
  if (tooLong(draft.contact.address, LIMITS.address)) {
    errors['contact.address'] = `Address must be ${LIMITS.address} characters or fewer.`;
  }

  return errors;
}
