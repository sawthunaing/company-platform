import type { Contact } from '@/lib/content';
import styles from './home.module.css';

type Props = { name: string; contact: Contact; year: number };

export function Footer({ name, contact, year }: Props) {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.container} ${styles.footerInner}`}>
        <p>
          © {year} {name}
        </p>
        {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
      </div>
    </footer>
  );
}
