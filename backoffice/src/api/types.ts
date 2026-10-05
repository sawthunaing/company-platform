// Same shape as api/src/content/dto/home-content.dto.ts.
export interface Section {
  title: string;
  body: string;
}

export interface Contact {
  email?: string;
  phone?: string;
  address?: string;
}

export interface HomeContent {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl?: string;
  sections: Section[];
  contact: Contact;
}

export interface HomeContentResponse extends HomeContent {
  updatedAt: string;
}

export const LIMITS = {
  heroTitle: 120,
  heroSubtitle: 300,
  sections: 20,
  sectionTitle: 120,
  sectionBody: 5000,
  phone: 40,
  address: 300,
} as const;
