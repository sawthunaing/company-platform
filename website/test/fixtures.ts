import type { HomeContent } from '@/lib/content';

export const CONTENT: HomeContent = {
  heroTitle: 'Northwind Consulting',
  heroSubtitle: 'Engineering teams that ship on time.',
  heroImageUrl: '/uploads/3f2a.png',
  sections: [
    { title: 'Cloud migration', body: 'We move your systems to the cloud.\n\nWith no downtime.' },
    { title: 'About', body: 'Founded in 2010 in Leeds.' },
    { title: 'Support', body: 'Around-the-clock help desk.' },
  ],
  contact: { email: 'hello@northwind.example', phone: '+44 20 7946 0000', address: '1 High Street\nLeeds' },
  updatedAt: '2026-10-05T10:00:00.000Z',
};
