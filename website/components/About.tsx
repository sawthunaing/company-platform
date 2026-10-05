import type { Section } from '@/lib/content';
import { Paragraphs } from './Paragraphs';
import styles from './home.module.css';

export function About({ section }: { section: Section }) {
  return (
    <section className={styles.about} aria-labelledby="about">
      <div className={`${styles.container} ${styles.narrow}`}>
        <h2 id="about">{section.title}</h2>
        <Paragraphs text={section.body} />
      </div>
    </section>
  );
}
