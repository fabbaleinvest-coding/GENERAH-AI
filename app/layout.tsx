import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://generah-ai.vercel.app'),
  title: {
    default: 'GENERAH AI — Sales Never Sleep',
    template: '%s · GENERAH AI',
  },
  description:
    'GENERAH AI è l’ecosistema di vendita autonomo guidato dall’intelligenza artificiale: acquisisce, coltiva e converte ogni contatto, 24/7/365. Agente vocale, video consulti, CRM automatico, marketing autonomo.',
  keywords: [
    'GENERAH AI',
    'intelligenza artificiale vendite',
    'agente vocale AI',
    'video consulti AI',
    'CRM automatico',
    'lead generation AI',
    'marketing autonomo',
  ],
  openGraph: {
    title: 'GENERAH AI — Sales Never Sleep',
    description:
      'Un reparto vendite intero, instancabile, sempre presente. Acquisisce, coltiva e converte ogni contatto, 24/7/365.',
    type: 'website',
    locale: 'it_IT',
    siteName: 'GENERAH AI',
  },
  icons: {
    icon: '/logo-mark.png',
    apple: '/logo-mark.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ink text-bone antialiased">
        <LanguageProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
