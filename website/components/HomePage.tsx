import { heroImageSrc, splitSections, type HomeContent } from '@/lib/content';
import { LABELS } from '@/lib/labels';
import { About } from './About';
import { ContactInfo } from './ContactInfo';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { Services } from './Services';
import styles from './home.module.css';

type Props = { content: HomeContent | null; year: number };

export function HomePage({ content, year }: Props) {
  if (!content) {
    return (
      <main className={`${styles.container} ${styles.placeholder}`}>
        <p>{LABELS.unavailable}</p>
      </main>
    );
  }

  const { about, services } = splitSections(content.sections);
  return (
    <>
      <Hero title={content.heroTitle} subtitle={content.heroSubtitle} imageSrc={heroImageSrc(content)} />
      <main>
        <Services sections={services} />
        {about && <About section={about} />}
        <ContactInfo contact={content.contact} />
      </main>
      <Footer name={content.heroTitle} contact={content.contact} year={year} />
    </>
  );
}
