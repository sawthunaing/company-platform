import type { Section } from '@/lib/content';
import { Paragraphs } from './Paragraphs';
import styles from './home.module.css';

export function Services({ sections }: { sections: Section[] }) {
  if (sections.length === 0) return null;
  return (
    <div className={styles.container}>
      <ul className={styles.services}>
        {sections.map((s, i) => (
          <li key={i} className={styles.card}>
            <section aria-labelledby={`service-${i}`}>
              <h2 id={`service-${i}`}>{s.title}</h2>
              <Paragraphs text={s.body} />
            </section>
          </li>
        ))}
      </ul>
    </div>
  );
}
