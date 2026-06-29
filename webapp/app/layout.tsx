import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/lib/store';

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GENERAH AI · Console',
  description:
    'La console operativa di GENERAH AI. Attiva il tuo reparto vendite autonomo: knowledge base, campagne ADS in AI, video-consulti e CRM. Sales never sleep.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0B1622',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-ink text-bone">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
