import type { HomeContent } from '../lib/content';

export const MOCK_API_PORT: number;
export const MOCK_CONTROL_PORT: number;
export const DEFAULT_CONTENT: Omit<HomeContent, 'updatedAt' | 'heroImageUrl'> & {
  heroImageUrl: string;
  contact: { email: string; phone: string; address: string };
};
export function startMockApi(ports?: { apiPort?: number; controlPort?: number }): Promise<{ close(): Promise<void> }>;
