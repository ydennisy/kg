import type { Metadata } from 'next';
import { DM_Mono, Inter } from 'next/font/google';
// KaTeX ships its own stylesheet and its layout depends on it entirely;
// rendered math is unreadable without it.
import 'katex/dist/katex.min.css';
import 'twenty-ui/theme-light.css';
import 'twenty-ui/theme-dark.css';
import './globals.css';

import { Theme } from '@/components/theme';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Knowledge',
  description: 'Cards, notes and links, searchable and drillable.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      // The theme class is set by the provider after hydration.
      suppressHydrationWarning
      className={`light ${inter.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
