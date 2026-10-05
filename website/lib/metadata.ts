import type { Metadata } from 'next';
import { heroImageSrc, type HomeContent } from './content';

const DESCRIPTION_MAX = 160;

function description(content: HomeContent): string {
  const text = content.heroSubtitle.trim() || content.sections[0]?.body.trim() || content.heroTitle;
  return text.length > DESCRIPTION_MAX ? `${text.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…` : text;
}

export function homeMetadata(content: HomeContent | null): Metadata {
  // Placeholder page: keep it out of search results.
  if (!content) return { robots: { index: false } };

  const image = heroImageSrc(content);
  return {
    title: content.heroTitle,
    description: description(content),
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      url: '/',
      title: content.heroTitle,
      description: description(content),
      images: image ? [{ url: image }] : undefined,
    },
  };
}
