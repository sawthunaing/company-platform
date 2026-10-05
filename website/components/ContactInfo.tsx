import type { Contact } from '@/lib/content';
import { LABELS } from '@/lib/labels';
import styles from './home.module.css';

export function ContactInfo({ contact }: { contact: Contact }) {
  const { email, phone, address } = contact;
  if (!email && !phone && !address) return null;

  return (
    <section className={styles.contact} aria-labelledby="contact">
      <div className={styles.container}>
        <h2 id="contact">{LABELS.contact}</h2>
        <dl className={styles.contactList}>
          {email && (
            <div>
              <dt>{LABELS.email}</dt>
              <dd>
                <a href={`mailto:${email}`}>{email}</a>
              </dd>
            </div>
          )}
          {phone && (
            <div>
              <dt>{LABELS.phone}</dt>
              <dd>
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>
              </dd>
            </div>
          )}
          {address && (
            <div>
              <dt>{LABELS.address}</dt>
              <dd className={styles.address}>{address}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );
}
