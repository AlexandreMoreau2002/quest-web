import type { Metadata } from 'next';
import { Chakra_Petch, Pirata_One, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-source-serif',
});

const pirateDisplay = Pirata_One({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-pirate-display',
});

const futuristDisplay = Chakra_Petch({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-futurist-display',
});

export const metadata: Metadata = {
  title: 'Quest · Ton atlas de progression',
  description: 'Transforme tes objectifs en quêtes explorables.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body
        className={`${sourceSerif.variable} ${pirateDisplay.variable} ${futuristDisplay.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
