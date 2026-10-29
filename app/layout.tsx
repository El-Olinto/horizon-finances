import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Horizon - Gestão Financeira',
  description: 'Controle de finanças, metas e caixinhas',
  icons: {
    icon: '/favicon.svg?v=2',
  },
  other: {
    google: 'notranslate',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate">
      <body>{children}</body>
    </html>
  );
}