import Image from 'next/image';
import styles from './home.module.css';

type Props = { title: string; subtitle: string; imageSrc?: string };

export function Hero({ title, subtitle, imageSrc }: Props) {
  return (
    <header className={styles.hero}>
      <div className={`${styles.container} ${styles.heroInner}`}>
        <div className={styles.heroText}>
          <h1>{title}</h1>
          {subtitle && <p className={styles.lead}>{subtitle}</p>}
        </div>
        {imageSrc && (
          <div className={styles.heroImage}>
            {/* Decorative: the title next to it carries the meaning. */}
            <Image src={imageSrc} alt="" fill preload sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
        )}
      </div>
    </header>
  );
}
