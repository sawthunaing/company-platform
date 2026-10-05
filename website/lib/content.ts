import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { API_URL } from './config';

// Matches HomeContentResponseDto in api/src/content/dto/home-content.dto.ts.
export type Section = { title: string; body: string };
export type Contact = { email?: string; phone?: string; address?: string };
export type HomeContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl?: string;
  sections: Section[];
  contact: Contact;
  updatedAt: string;
};

export const REVALIDATE_SECONDS = 60;

export class ContentUnavailableError extends Error {}

// Throws when the API cannot be reached or does not answer 200. During ISR a throw
// makes Next.js keep serving the last page it generated, which is what we want.
export async function fetchHome(): Promise<HomeContent> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/home`, { next: { revalidate: REVALIDATE_SECONDS } });
  } catch (err) {
    throw new ContentUnavailableError(`GET /api/home failed: ${(err as Error).message}`, { cause: err });
  }
  if (!res.ok) throw new ContentUnavailableError(`GET /api/home returned ${res.status}`);

  const data = (await res.json()) as HomeContent;
  return { ...data, sections: data.sections ?? [], contact: data.contact ?? {} };
}

// Returns null only while `next build` runs with the API unreachable: there is no
// cached page yet, so the build renders a placeholder that the next refresh replaces.
// At runtime it always throws instead, so a cached page is never replaced.
export async function getHome(): Promise<HomeContent | null> {
  try {
    return await fetchHome();
  } catch (err) {
    if (err instanceof ContentUnavailableError && process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
      console.warn(`${err.message}; rendering the placeholder until the API is back`);
      return null;
    }
    throw err;
  }
}

// The API stores the uploaded image as a path on the API host, e.g. /uploads/<uuid>.png.
export function heroImageSrc(content: HomeContent): string | undefined {
  return content.heroImageUrl ? new URL(content.heroImageUrl, `${API_URL}/`).toString() : undefined;
}

// A section titled "About" is the About block. The rest are the services.
export function splitSections(sections: Section[]): { about?: Section; services: Section[] } {
  const isAbout = (s: Section) => s.title.trim().toLowerCase() === 'about';
  return { about: sections.find(isAbout), services: sections.filter((s) => !isAbout(s)) };
}
