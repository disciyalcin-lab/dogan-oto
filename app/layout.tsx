import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  applicationName: 'DOĞAN OTO',
  title: 'DOĞAN OTO | Oto Tamirhane Operasyon & Randevu',
  description: 'DOĞAN OTO - Tamirhane operasyon ve randevu yönetimi',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'DOĞAN OTO',
    statusBarStyle: 'black-translucent',
  },
  openGraph: {
    title: 'DOĞAN OTO',
    description: 'DOĞAN OTO - Tamirhane operasyon ve randevu yönetimi',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
