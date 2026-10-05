import type { HomeContent } from '../api/types';

// The form keeps every field as a string, and gives each section a stable key for React.
export interface SectionDraft {
  key: string;
  title: string;
  body: string;
}

export interface Draft {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  sections: SectionDraft[];
  contact: { email: string; phone: string; address: string };
}

let nextKey = 0;
export const newSectionKey = () => `s${++nextKey}`;

export function toDraft(content: HomeContent): Draft {
  return {
    heroTitle: content.heroTitle,
    heroSubtitle: content.heroSubtitle,
    heroImageUrl: content.heroImageUrl ?? '',
    sections: content.sections.map((s) => ({ key: newSectionKey(), title: s.title, body: s.body })),
    contact: {
      email: content.contact.email ?? '',
      phone: content.contact.phone ?? '',
      address: content.contact.address ?? '',
    },
  };
}

// Empty optional fields are left out: the API accepts a missing field, not an empty string.
export function toPayload(draft: Draft): HomeContent {
  const contact: HomeContent['contact'] = {};
  const email = draft.contact.email.trim();
  const phone = draft.contact.phone.trim();
  const address = draft.contact.address.trim();
  if (email) contact.email = email;
  if (phone) contact.phone = phone;
  if (address) contact.address = address;

  return {
    heroTitle: draft.heroTitle.trim(),
    heroSubtitle: draft.heroSubtitle.trim(),
    ...(draft.heroImageUrl ? { heroImageUrl: draft.heroImageUrl } : {}),
    sections: draft.sections.map((s) => ({ title: s.title.trim(), body: s.body })),
    contact,
  };
}
