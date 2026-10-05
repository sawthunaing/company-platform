import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomePage } from '@/components/HomePage';
import { LABELS } from '@/lib/labels';
import { CONTENT } from './fixtures';

const YEAR = 2026;

// Every piece of text on the page, split the way the user reads it.
function visibleText(container: HTMLElement): string[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const out: string[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text) out.push(text);
  }
  return out;
}

describe('Home page', () => {
  it('shows only text from the API, plus the contact labels', () => {
    const { container } = render(<HomePage content={CONTENT} year={YEAR} />);

    const fromApi = [
      CONTENT.heroTitle,
      CONTENT.heroSubtitle,
      ...CONTENT.sections.flatMap((s) => [s.title, ...s.body.split(/\n\s*\n/)]),
      ...Object.values(CONTENT.contact),
    ];
    const allowed = new Set<string>([...fromApi, LABELS.contact, LABELS.email, LABELS.phone, LABELS.address, '©', String(YEAR)]);

    const unexpected = visibleText(container).filter((t) => !allowed.has(t));
    expect(unexpected).toEqual([]);
  });

  it('shows every field from the API', () => {
    render(<HomePage content={CONTENT} year={YEAR} />);

    expect(screen.getByRole('heading', { level: 1, name: CONTENT.heroTitle })).toBeInTheDocument();
    expect(screen.getByText(CONTENT.heroSubtitle)).toBeInTheDocument();
    for (const s of CONTENT.sections) expect(screen.getByRole('heading', { level: 2, name: s.title })).toBeInTheDocument();
    expect(screen.getByText('With no downtime.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+44 20 7946 0000' })).toHaveAttribute('href', 'tel:+442079460000');
    expect(screen.getByText(/1 High Street/)).toBeInTheDocument();
  });

  it('shows the hero image from the API host', () => {
    const { container } = render(<HomePage content={CONTENT} year={YEAR} />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'http://localhost:3000/uploads/3f2a.png');
  });

  it('puts the About section in its own block, after the services', () => {
    render(<HomePage content={CONTENT} year={YEAR} />);

    const services = screen.getByRole('list');
    expect(within(services).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Cloud migration', 'Support']);
    const about = screen.getByRole('region', { name: 'About' });
    expect(services.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('builds the footer from the company name and contact email', () => {
    render(<HomePage content={CONTENT} year={YEAR} />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(`© ${YEAR} ${CONTENT.heroTitle}`);
    expect(within(footer).getByRole('link', { name: CONTENT.contact.email })).toHaveAttribute('href', `mailto:${CONTENT.contact.email}`);
  });

  it('leaves out what the API does not have', () => {
    const { container } = render(
      <HomePage content={{ ...CONTENT, heroImageUrl: undefined, heroSubtitle: '', sections: [], contact: {} }} year={YEAR} />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.queryByRole('region', { name: LABELS.contact })).toBeNull();
    // Hero title, then the footer: "©", year, company name.
    expect(visibleText(container)).toEqual([CONTENT.heroTitle, '©', String(YEAR), CONTENT.heroTitle]);
  });

  it('shows the placeholder when there is no content yet', () => {
    render(<HomePage content={null} year={YEAR} />);
    expect(screen.getByText(LABELS.unavailable)).toBeInTheDocument();
  });
});
