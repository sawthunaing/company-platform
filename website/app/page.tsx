import type { Metadata } from 'next';
import { HomePage } from '@/components/HomePage';
import { getHome } from '@/lib/content';
import { homeMetadata } from '@/lib/metadata';

// ISR: regenerate at most once a minute. Must be a literal; keep it equal to REVALIDATE_SECONDS.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadata(await getHome());
}

export default async function Page() {
  return <HomePage content={await getHome()} year={new Date().getFullYear()} />;
}
