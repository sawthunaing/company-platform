import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { afterEach, vi } from 'vitest';

// next/image needs the Next.js runtime; a plain <img> is enough to test what the page shows.
vi.mock('next/image', () => ({
  default: ({ fill: _fill, preload: _preload, ...props }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean }) => (
    <img {...props} />
  ),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
