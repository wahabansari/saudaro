import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'SAUDARO', template: '%s · SAUDARO' },
  description: 'B2B import and export marketplace.',
  icons: { icon: '/brand/saudaro-favicon.svg', apple: '/brand/saudaro-app-icon.svg' },
};

// The bundle declares the font with @font-face; this preloads the same hashed asset.
const interUrl = new URL('../styles/fonts/InterVariable.woff2', import.meta.url).href;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preload" href={interUrl} as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
